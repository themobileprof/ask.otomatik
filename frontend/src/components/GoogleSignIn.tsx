import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleSignInProps {
  className?: string;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ className }) => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Google Sign In is not properly configured.",
      });
      return;
    }

    const handleCredentialResponse = async (response: any) => {
      try {
        await signIn(response.credential);
        toast({
          title: "Success",
          description: "Successfully signed in!",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to sign in with Google. Please try again.",
        });
      }
    };

    const initializeGoogleSignIn = () => {
      if (!window.google?.accounts?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Google Sign In failed to load properly.",
        });
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            width: buttonRef.current.offsetWidth || 200,
            logo_alignment: 'center',
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize Google Sign In.",
        });
      }
    };

    // Clean up any existing instances
    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }

    // Remove any existing script
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and load new script
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    script.onerror = () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load Google Sign In script.",
      });
    };

    scriptRef.current = script;
    document.body.appendChild(script);

    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [signIn, toast]);

  return (
    <div 
      ref={buttonRef}
      className={`${className} min-h-[40px] w-full flex items-center justify-center bg-white`}
    />
  );
};

export default GoogleSignIn; 