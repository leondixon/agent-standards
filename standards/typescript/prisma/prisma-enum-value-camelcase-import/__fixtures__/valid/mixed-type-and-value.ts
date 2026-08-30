import {
  OrderStatus as orderStatus,
  type OrderStatus,
} from '../generated/prisma/enums';

export const status: OrderStatus = orderStatus.pending;
