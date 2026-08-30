export function listPaymentMethodsHandler() {
  return {
    paymentMethods: [
      {
        id: 'pm_1',
        acquiredCardId: 'card_1',
        isDefault: true,
      },
    ],
  };
}
