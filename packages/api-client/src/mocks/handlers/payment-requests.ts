import Big from 'big.js';
import { Account, Asset, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { http, HttpResponse } from 'msw';
import { paginate } from '../list';
import type { PaymentRequest, PaymentRequestInput } from '../../types';
import { TESTNET_USDC_ISSUER } from '../constants';
import {
  authenticate,
  error,
  newId,
  requireRole,
  WRITE_ROLES,
  type Caller,
  type MockContext,
} from '../context';
import type { MockDb } from '../db';
import { policyFor, viewFor } from '../policy';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
/** How long the fake indexer takes to "see" a submitted payment. */
export const SETTLE_DELAY_MS = 3000;

function memoFor(request: PaymentRequest) {
  if (!request.memo) return Memo.none();
  if (request.memoType === 'id') return Memo.id(request.memo);
  if (request.memoType === 'hash') return Memo.hash(request.memo);
  return Memo.text(request.memo);
}

function decide(
  db: MockDb,
  caller: Caller,
  request: PaymentRequest,
  approved: boolean,
  comment?: string,
) {
  request.approvals.push({
    userId: caller.user.id,
    userName: caller.user.name,
    decision: approved ? 'approved' : 'rejected',
    comment,
    decidedAt: new Date().toISOString(),
  });
  if (!approved) request.status = 'rejected';
  else if (
    request.approvals.filter((a) => a.decision === 'approved').length >= request.requiredApprovals
  ) {
    request.status = 'approved';
  }
  return viewFor(db, request, caller);
}

function settle(db: MockDb, request: PaymentRequest) {
  request.status = 'settled';
  const account = db.treasuryAccounts.find((a) => a.id === request.treasuryAccountId);
  const balance = account?.balances.find((b) => b.assetCode === request.assetCode);
  if (balance) balance.amount = new Big(balance.amount).minus(request.amount).toFixed(2);
  db.transactions.unshift({
    id: newId('tx'),
    txHash: request.txHash!,
    direction: 'outgoing',
    amount: request.amount,
    assetCode: request.assetCode,
    from: request.treasuryAddress,
    to: request.destination,
    memo: request.memo ?? '',
    createdAt: new Date().toISOString(),
    matchStatus: 'matched',
    paymentRequestId: request.id,
  });
}

export const paymentRequestHandlers = ({ db, base }: MockContext) => {
  const find = (id: unknown) => db.paymentRequests.find((p) => p.id === id);

  return [
    http.get(`${base}/payment-requests`, ({ request }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const rows = db.paymentRequests.filter((p) => !status || p.status === status);
      const page = paginate(rows, url, {
        search: (p) => [p.vendorName, p.description, p.memo, p.amount],
        sortable: {
          createdAt: { get: (p) => p.createdAt },
          amount: { get: (p) => p.amount, decimal: true },
          vendorName: { get: (p) => p.vendorName },
          status: { get: (p) => p.status },
        },
        defaultSort: 'createdAt:desc',
      });
      if (page instanceof Response) return page;
      return HttpResponse.json({ ...page, data: page.data.map((p) => viewFor(db, p, caller)) });
    }),

    http.get(`${base}/payment-requests/:id`, ({ request, params }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const pr = find(params.id);
      return pr
        ? HttpResponse.json(viewFor(db, pr, caller))
        : error(404, 'not_found', 'Payment request not found.');
    }),

    http.post(`${base}/payment-requests`, async ({ request }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const denied = requireRole(caller, WRITE_ROLES);
      if (denied) return denied;
      const input = (await request.json()) as PaymentRequestInput;
      const vendor = db.vendors.find((v) => v.id === input.vendorId);
      const account = db.treasuryAccounts.find((a) => a.id === input.treasuryAccountId);
      if (!vendor || !account) return error(422, 'invalid', 'Pick a vendor and treasury account.');
      const pr: PaymentRequest = {
        id: newId('pr'),
        status: 'pending_approval',
        vendorId: vendor.id,
        vendorName: vendor.name,
        destination: vendor.payoutAddress,
        amount: input.amount,
        assetCode: input.assetCode,
        memo: vendor.requiredMemo,
        memoType: vendor.memoType,
        description: input.description ?? '',
        treasuryAccountId: account.id,
        treasuryAddress: account.address,
        requiredApprovals: policyFor(db, input.amount, input.assetCode).requiredApprovals,
        approvals: [],
        createdByName: caller.user.name,
        createdAt: new Date().toISOString(),
        canApprove: false,
        canSubmit: false,
      };
      db.paymentRequests.push(pr);
      return HttpResponse.json(viewFor(db, pr, caller), { status: 201 });
    }),

    http.get(`${base}/approvals`, ({ request }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const data = db.paymentRequests
        .map((p) => viewFor(db, p, caller))
        .filter((p) => p.canApprove);
      return HttpResponse.json({ data });
    }),

    http.post(`${base}/payment-requests/:id/approve`, async ({ request, params }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const pr = find(params.id);
      if (!pr) return error(404, 'not_found', 'Payment request not found.');
      if (!viewFor(db, pr, caller).canApprove)
        return error(403, 'forbidden', "You can't approve this request.");
      const { comment } = (await request.json()) as { comment?: string };
      return HttpResponse.json(decide(db, caller, pr, true, comment));
    }),

    http.post(`${base}/payment-requests/:id/reject`, async ({ request, params }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const pr = find(params.id);
      if (!pr) return error(404, 'not_found', 'Payment request not found.');
      if (!viewFor(db, pr, caller).canApprove)
        return error(403, 'forbidden', "You can't reject this request.");
      const { comment } = (await request.json()) as { comment?: string };
      return HttpResponse.json(decide(db, caller, pr, false, comment));
    }),

    http.post(`${base}/payment-requests/:id/build-tx`, ({ request, params }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const pr = find(params.id);
      if (!pr) return error(404, 'not_found', 'Payment request not found.');
      if (!viewFor(db, pr, caller).canSubmit)
        return error(403, 'forbidden', "You can't send this payment.");
      // Sequence "0" — fine for a mock; the real backend loads the account's sequence from Horizon.
      const tx = new TransactionBuilder(new Account(pr.treasuryAddress, '0'), {
        fee: '100',
        networkPassphrase: TESTNET_PASSPHRASE,
      })
        .addOperation(
          Operation.payment({
            destination: pr.destination,
            asset:
              pr.assetCode === 'XLM'
                ? Asset.native()
                : new Asset(pr.assetCode, TESTNET_USDC_ISSUER),
            amount: pr.amount,
          }),
        )
        .addMemo(memoFor(pr))
        .setTimeout(300)
        .build();
      return HttpResponse.json({
        xdr: tx.toXDR(),
        networkPassphrase: TESTNET_PASSPHRASE,
        summary: {
          from: pr.treasuryAddress,
          to: pr.destination,
          assetCode: pr.assetCode,
          amount: pr.amount,
          memo: pr.memo,
          fee: '0.0000100',
        },
      });
    }),

    http.post(`${base}/payment-requests/:id/submit`, async ({ request, params }) => {
      const caller = authenticate(db, request);
      if (caller instanceof Response) return caller;
      const pr = find(params.id);
      if (!pr) return error(404, 'not_found', 'Payment request not found.');
      if (!viewFor(db, pr, caller).canSubmit)
        return error(403, 'forbidden', "You can't send this payment.");
      const { signedXdr } = (await request.json()) as { signedXdr: string };
      if (!signedXdr) return error(422, 'invalid', 'Missing signed transaction.');
      pr.status = 'submitted';
      pr.txHash = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');
      setTimeout(() => settle(db, pr), SETTLE_DELAY_MS);
      return HttpResponse.json(viewFor(db, pr, caller));
    }),
  ];
};
