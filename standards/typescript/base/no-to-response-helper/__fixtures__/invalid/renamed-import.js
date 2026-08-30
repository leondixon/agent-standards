import { toPaymentMethodResponse as mapPaymentMethod } from './mappers';

export function handler(paymentMethod) {
  return mapPaymentMethod(paymentMethod);
}
