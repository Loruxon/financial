import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signInAsMockUser } from "@/modules/auth/actions";
import { listLoginableUsers } from "@/modules/users/queries";
import { messages } from "@/messages/ru";

export async function LoginForm() {
  const users = await listLoginableUsers();

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{messages.auth.login}</CardTitle>
          <CardDescription>{messages.auth.loginDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">
                {messages.auth.usernameField}
              </FieldLabel>
              <Input id="username" name="username" autoComplete="username" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">
                {messages.auth.passwordField}
              </FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </Field>
            <Field>
              <Button type="button" disabled>
                {messages.auth.signIn}
              </Button>
            </Field>
          </FieldGroup>

          <div className="my-4 flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs">
              {messages.auth.chooseUser}
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <form key={user.id} action={signInAsMockUser}>
                <input type="hidden" name="userId" value={user.id} />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span>{user.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {user.username}
                  </span>
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
