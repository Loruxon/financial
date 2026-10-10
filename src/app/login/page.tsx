import { Badge } from "@/components/ui/badge";
import { LoginForm } from "@/components/custom/login-form";
import { messages } from "@/messages/ru";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6">
      <Badge variant="outline" className="absolute top-4 right-4">
        {messages.auth.prototypeMode}
      </Badge>
      <LoginForm />
    </div>
  );
}
