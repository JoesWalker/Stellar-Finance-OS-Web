import type { InvoiceStatus, MatchStatus, PaymentRequestStatus } from '../types';
import type { ListParams } from './list';

export interface DateRangeParams {
  /** Inclusive start date, YYYY-MM-DD. */
  from?: string;
  /** Inclusive end date, YYYY-MM-DD. */
  to?: string;
}

export interface InvoiceListParams extends ListParams, DateRangeParams {
  status?: InvoiceStatus | InvoiceStatus[];
  clientId?: string;
  assetCode?: string;
}

export interface TransactionListParams extends ListParams, DateRangeParams {
  matchStatus?: MatchStatus;
}

export interface PaymentRequestListParams extends ListParams {
  status?: PaymentRequestStatus;
}

export type ClientListParams = ListParams;
export type VendorListParams = ListParams;
