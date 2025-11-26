import * as React from "react";

export default function CallIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6.6 10.8c1.3 2.4 3.2 4.3 5.6 5.6l1.9-1.9c.3-.3.8-.4 1.2-.3l3 .8c.5.1.8.6.8 1.1v3.1c0 .6-.5 1.1-1.1 1.1C9.7 20.3 3.7 14.3 3.7 6.1c0-.6.5-1.1 1.1-1.1h3.1c.5 0 1 .3 1.1.8l.8 3c.1.4 0 .9-.3 1.2l-1.9 1.9Z"
        fill="currentColor"
      />
    </svg>
  );
}
