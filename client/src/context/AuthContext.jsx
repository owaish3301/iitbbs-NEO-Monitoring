import { createContext, useEffect, useState, useContext } from "react";

import supabase from "../lib/supabase";


const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signup = async ({ email, password }) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    } finally {
      setLoading(false);
    }
  };

  const signin = async ({ email, password }) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    } finally {
      setLoading(false);
    }
  };

  const signout = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    try{
      setLoading(true);
      const { error} = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "/home"
        },
      });

      if(error){
        return { success: false, error:error.message};
      }
      return { success: true}

    } catch{
      return { success: false, error:"An unexpected error occured"};
    }finally{
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ loading, session, signup, signin, signout, continueWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, AuthContext, useAuth };
