"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { messages } from "@/messages/ru";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>{messages.common.errorTitle}</EmptyTitle>
          <EmptyDescription>
            {messages.common.errorDescription}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              {messages.common.retry}
            </Button>
            <Button render={<Link href="/" />}>{messages.common.goHome}</Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
