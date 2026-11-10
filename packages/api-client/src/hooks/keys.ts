import type {
  ClientListParams,
  InvoiceListParams,
  PaymentRequestListParams,
  TransactionListParams,
  VendorListParams,
} from './params';

/** Central query keys so mutations can invalidate precisely. */
export const keys = {
  me: ['me'] as const,
  clients: {
    all: ['clients'] as const,
    list: (params: ClientListParams = {}) => ['clients', 'list', params] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params: InvoiceListParams = {}) => ['invoices', 'list', params] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
    public: (token: string) => ['public-invoice', token] as const,
  },
  vendors: {
    all: ['vendors'] as const,
    list: (params: VendorListParams = {}) => ['vendors', 'list', params] as const,
  },
  treasuryAccounts: { all: ['treasury-accounts'] as const },
  paymentRequests: {
    all: ['payment-requests'] as const,
    list: (params: PaymentRequestListParams = {}) => ['payment-requests', 'list', params] as const,
    detail: (id: string) => ['payment-requests', 'detail', id] as const,
  },
  approvals: { all: ['approvals'] as const },
  transactions: {
    all: ['transactions'] as const,
    list: (params: TransactionListParams = {}) => ['transactions', 'list', params] as const,
  },
  dashboard: ['dashboard'] as const,
  reports: { treasury: (from: string, to: string) => ['reports', 'treasury', from, to] as const },
  org: ['org'] as const,
  members: ['members'] as const,
  approvalPolicies: ['approval-policies'] as const,
};
