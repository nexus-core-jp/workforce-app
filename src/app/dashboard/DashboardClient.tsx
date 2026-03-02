"use client";

import { ToastContainer, useToast } from "./Toast";
import { TimeClock } from "./TimeClock";
import { CorrectionsPanel } from "./CorrectionsPanel";
import { ClosePanel } from "./ClosePanel";

interface Props {
  canClockIn: boolean;
  canBreakStart: boolean;
  canBreakEnd: boolean;
  canClockOut: boolean;
  isAdminOrApprover: boolean;
  pendingCount: number;
  pendingForApproval: Array<{ id: string; userLabel: string; dateLabel: string; reason: string }>;
  isAdmin: boolean;
  month: string;
  isClosed: boolean;
}

export function DashboardClient(props: Props) {
  const { toasts, show } = useToast();

  return (
    <>
      <TimeClock
        canClockIn={props.canClockIn}
        canBreakStart={props.canBreakStart}
        canBreakEnd={props.canBreakEnd}
        canClockOut={props.canClockOut}
        onToast={show}
      />

      <CorrectionsPanel
        isAdminOrApprover={props.isAdminOrApprover}
        pendingCount={props.pendingCount}
        pendingForApproval={props.pendingForApproval}
        onToast={show}
      />

      <ClosePanel
        isAdmin={props.isAdmin}
        month={props.month}
        isClosed={props.isClosed}
        onToast={show}
      />

      <ToastContainer toasts={toasts} />
    </>
  );
}
