import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { signUp, signInWithProvider } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Parola trebuie să aibă cel puțin 8 caractere.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Parola trebuie să conțină cel puțin o literă mare.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Parola trebuie să conțină cel puțin o literă mică.';
    }
    if (!/[0-9]/.test(password)) {
      return 'Parola trebuie să conțină cel puțin o cifră.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!fullName.trim()) {
      setError('Te rugăm să introduci numele complet.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }

    if (!acceptTerms) {
      setError('Trebuie să accepți termenii și condițiile.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('Există deja un cont cu această adresă de email.');
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: 'Cont creat cu succes!',
          description: 'Verifică emailul pentru a-ți activa contul.',
        });
        setSuccess(true);
      }
    } catch (err) {
      setError('A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    
    try {
      const { error } = await signInWithProvider('google');
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('A apărut o eroare la înregistrarea cu Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-border/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-2xl font-bold">Verifică-ți emailul</CardTitle>
              <CardDescription className="text-base">
                Am trimis un link de confirmare la <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Dă click pe linkul din email pentru a-ți activa contul și a începe să folosești FinGuard.
              </p>
              <Alert>
                <AlertDescription>
                  Nu ai primit emailul? Verifică și folderul de spam.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Înapoi la autentificare
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            FinGuard
          </span>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Creează cont</CardTitle>
            <CardDescription>
              Începe analiza financiară în câteva minute
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span className="ml-2">Continuă cu Google</span>
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  sau cu email
                </span>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nume complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Ion Popescu"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nume@companie.ro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minim 8 caractere, cu literă mare, mică și cifră
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmă parola</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  disabled={loading || googleLoading}
                />
                <label 
                  htmlFor="terms" 
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  Accept{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Termenii și Condițiile
                  </Link>
                  {' '}și{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Politica de Confidențialitate
                  </Link>
                </label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se creează contul...
                  </>
                ) : (
                  'Creează cont'
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-center text-muted-foreground">
              Ai deja cont?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Autentifică-te
              </Link>
            </p>
          </CardFooter>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:underline">
            ← Înapoi la pagina principală
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
