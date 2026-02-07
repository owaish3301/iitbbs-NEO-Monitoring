import { useState, useEffect } from 'react';
import { Rocket, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import StarBackground from '../components/landingPage/StarBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signin, signup, continueWithGoogle, session } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  useEffect(() => {
    if (session) {
      navigate('/home', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);

    const result = isLogin
      ? await signin({ email, password })
      : await signup({ email, password });

    setSubmitting(false);

    if (result.success) {
      toast.success(isLogin ? 'Welcome back, Explorer!' : 'Account created successfully!');
      navigate('/home');
    } else {
      toast.error(result.error || 'Something went wrong');
    }
  };

  const handleGoogle = async () => {
    const result = await continueWithGoogle();
    if (!result.success) {
      toast.error(result.error || 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-black overflow-hidden px-4">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <StarBackground />
      </div>

      {/* Auth Container */}
      <div className="relative z-10 w-full max-w-4xl animate-in fade-in zoom-in-95 duration-500">
        <Card className="h-150 bg-black/40 backdrop-blur-xl border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row p-0 gap-0">

          {/* Left Side: Visuals */}
          <div className="hidden md:flex flex-col justify-between w-1/2 p-10 bg-linear-to-br from-cyan-900/20 to-purple-900/20 relative">
            <div className="absolute inset-0 bg-[url('/earthImage.png')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent"></div>

            <div className="relative z-10">
              <Link to="/" className="flex items-center gap-2 cursor-pointer group w-fit">
                <Rocket className="h-6 w-6 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
                <span className="text-xl font-bold text-white">SkyNetics</span>
              </Link>
            </div>

            <div className="relative z-10 pb-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                {isLogin ? 'Welcome Back, Explorer.' : 'Join the Mission.'}
              </h2>
              <p className="text-gray-300">
                {isLogin
                  ? 'Access your personal dashboard to track potentially hazardous asteroids in real-time.'
                  : 'Create an account to set personalized alerts and contribute to the community.'}
              </p>
            </div>
          </div>

          {/* Right Side: Form */}
          <CardContent className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-black/60 relative">
            {/* Decorative corner glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] pointer-events-none"></div>

            <div className="mb-8 text-center md:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                {isLogin ? 'Sign In' : 'Create Account'}
              </h3>
              <div className="text-sm text-gray-400 flex items-center justify-center md:justify-start gap-2">
                {isLogin ? 'New to SkyNetics?' : 'Already have an account?'}
                <Button
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-cyan-400 hover:text-cyan-300 font-medium p-0 h-auto"
                >
                  {isLogin ? 'Register now' : 'Log in'}
                </Button>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400 font-medium ml-1">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    type="email"
                    placeholder="cosmos@nasa.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl py-2.5 pl-10 pr-4 h-auto text-white placeholder:text-gray-600 focus-visible:border-cyan-500/50 focus-visible:bg-white/10 focus-visible:ring-0 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <Label className="text-xs text-gray-400 font-medium">Password</Label>
                  {/* {isLogin && (
                    <Button variant="link" className="text-xs text-cyan-500 hover:text-cyan-400 p-0 h-auto">
                      Forgot?
                    </Button>
                  )} */}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl py-2.5 pl-10 pr-4 h-auto text-white placeholder:text-gray-600 focus-visible:border-cyan-500/50 focus-visible:bg-white/10 focus-visible:ring-0 transition-all font-medium"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-900/20 transform hover:scale-[1.02] active:scale-[0.98] h-auto disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Launch Dashboard' : 'Initiate Launch Sequence'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Google Auth */}
            <div className="mt-8 relative flex items-center justify-center">
              <Separator className="bg-white/10" />
              <span className="absolute z-10 bg-[#0a0a0a] px-3 text-xs text-gray-500">OR CONTINUE WITH</span>
            </div>

            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={handleGoogle}
                className="bg-white/5 border-white/10 hover:bg-white/80 hover:border-white/20 gap-2 px-6 text-gray-300"
              >
                <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
                Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
