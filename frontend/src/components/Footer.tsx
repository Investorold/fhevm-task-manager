import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-zama-black text-zama-yellow py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium">
            Powered by Zama FHEVM
          </span>
        </div>
        <div className="text-center mt-2">
          <p className="text-zama-yellow text-opacity-70 text-xs">
            Fully Homomorphic Encryption for Privacy-Preserving Task Management
          </p>
        </div>
      </div>
    </footer>
  );
}

