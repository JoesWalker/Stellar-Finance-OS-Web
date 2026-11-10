import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePaymentRequest, useTreasuryAccounts, useVendors } from '@finance-os/api-client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  NativeSelect,
} from '@finance-os/ui';
import { isValidAmount } from '@finance-os/utils';
import { FormError } from '../../components/forms/form-error';

const schema = z.object({
  vendorId: z.string().min(1, 'Choose a vendor'),
  treasuryAccountId: z.string().min(1, 'Choose the account to pay from'),
  assetCode: z.enum(['USDC', 'XLM']),
  amount: z.string().trim().refine(isValidAmount, 'Enter an amount above 0 (max 7 decimals)'),
  description: z.string().trim().max(140, 'Keep it under 140 characters'),
});
type Values = z.infer<typeof schema>;

export function PaymentRequestFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const vendors = useVendors({ limit: 100, sort: 'name:asc' });
  const accounts = useTreasuryAccounts();
  const create = useCreatePaymentRequest();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      create.reset();
      reset({
        vendorId: '',
        treasuryAccountId: '',
        assetCode: 'USDC',
        amount: '',
        description: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open]);

  const onSubmit = handleSubmit((values) =>
    create.mutate(values, { onSuccess: () => onOpenChange(false) }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New payment request</DialogTitle>
          <DialogDescription>
            It goes to approvers first. Once approved, someone with signing rights sends it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError error={create.error} />
          <Field label="Vendor" htmlFor="pr-vendor" error={errors.vendorId?.message}>
            <NativeSelect id="pr-vendor" aria-invalid={!!errors.vendorId} {...register('vendorId')}>
              <option value="">Choose a vendor…</option>
              {vendors.data?.items.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <Field label="Amount" htmlFor="pr-amount" error={errors.amount?.message}>
              <Input
                id="pr-amount"
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                {...register('amount')}
              />
            </Field>
            <Field label="Currency" htmlFor="pr-asset">
              <NativeSelect id="pr-asset" {...register('assetCode')}>
                <option value="USDC">USDC</option>
                <option value="XLM">XLM</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Pay from" htmlFor="pr-account" error={errors.treasuryAccountId?.message}>
            <NativeSelect
              id="pr-account"
              aria-invalid={!!errors.treasuryAccountId}
              {...register('treasuryAccountId')}
            >
              <option value="">Choose a treasury account…</option>
              {accounts.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="What is it for? (optional)"
            htmlFor="pr-description"
            error={errors.description?.message}
          >
            <Input id="pr-description" {...register('description')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Submitting…' : 'Request approval'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
