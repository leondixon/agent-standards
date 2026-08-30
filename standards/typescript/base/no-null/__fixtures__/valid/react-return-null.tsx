import type { ReactElement } from 'react';

export function AngelCommentCard(): ReactElement | null {
  if (Math.random() < 0.5) {
    return null;
  }
  return <div />;
}

export function Conditional({ show }: { show: boolean }) {
  return <div>{show ? <span /> : null}</div>;
}
