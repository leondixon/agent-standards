import { toPaymentMethodResponse } from './mappers';

export function handler(paymentMethod) {
  return toPaymentMethodResponse(paymentMethod);
}
