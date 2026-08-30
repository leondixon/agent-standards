export async function getPaymentMethod(ctx) {
  const paymentMethod = await loadPaymentMethod();
  return ctx.json({
    id: paymentMethod.id,
    brand: paymentMethod.brand,
  });
}

async function loadPaymentMethod() {
  return { id: 'pm_1', brand: 'visa' };
}
