import { Shield, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-zama-yellow to-zama-yellow-light shadow-lg border-b-4 border-zama-yellow-dark">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-zama-black rounded-xl shadow-lg">
              <Shield className="w-7 h-7 text-zama-yellow" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zama-black">
                Confidential Task Manager
              </h1>
              <p className="text-zama-black text-opacity-80 font-medium">
                Powered by Zama FHEVM
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 text-zama-black font-semibold">
            <Zap className="w-5 h-5" />
            <span>Privacy-First dApp</span>
          </div>
        </div>
      </div>
    </header>
  );
}
