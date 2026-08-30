interface PaymentMethodResponse {
  id: string;
}

export function handler() {
  return { id: 'pm_1' } satisfies PaymentMethodResponse;
}
