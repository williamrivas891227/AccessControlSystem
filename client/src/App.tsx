import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import SecurityPage from "@/pages/security-page";
import AuthorizerPage from "@/pages/authorizer-page";
import ControllerPage from "@/pages/controller-page";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  const { user, isLoading } = useAuth();
  console.log("Current user state:", user); // Debug log

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="*">
          <AuthPage />
        </Route>
      </Switch>
    );
  }

  // Debug log
  console.log("Routing for role:", user.role);

  // Explicit routing based on role
  let Component;
  switch (user.role) {
    case "security":
      Component = SecurityPage;
      break;
    case "authorizer":
      Component = AuthorizerPage;
      break;
    case "controller":
      Component = ControllerPage;
      break;
    default:
      Component = NotFound;
  }

  return (
    <Switch>
      <Route path="/" component={Component} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;