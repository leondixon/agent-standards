declare const prisma: {
  user: {
    create: (args: { data: { dateOfBirth: Date | null } }) => Promise<unknown>;
    update: (args: { data: { dateOfBirth: Date | null } }) => Promise<unknown>;
    upsert: (args: {
      create: { dateOfBirth: Date | null };
      update: { dateOfBirth: Date | null };
    }) => Promise<unknown>;
  };
};

export async function clearDob(userId: string) {
  await prisma.user.update({
    data: { dateOfBirth: null },
  });
  await prisma.user.create({
    data: { dateOfBirth: null },
  });
  await prisma.user.upsert({
    create: { dateOfBirth: null },
    update: { dateOfBirth: null },
  });
  void userId;
}
