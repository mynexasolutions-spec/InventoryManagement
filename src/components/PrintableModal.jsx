"use client";

import { Printer } from "lucide-react";
import Modal from "./Modal";
import PrintPortal from "./PrintPortal";
import { Btn } from "./ui";

export default function PrintableModal({ open, onClose, title, subtitle, children, width = "max-w-4xl", extraActions }) {
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        width={width}
        actions={
          <>
            {extraActions}
            <Btn size="sm" onClick={() => window.print()}>
              <Printer size={14} /> <span className="hidden sm:inline">Print / PDF</span><span className="sm:hidden">Print</span>
            </Btn>
          </>
        }
      >
        <div className="overflow-x-auto bg-neutral-200/70 p-2 sm:p-4"><div className="zoom-fit">{children}</div></div>
      </Modal>
      {open && <PrintPortal>{children}</PrintPortal>}
    </>
  );
}
