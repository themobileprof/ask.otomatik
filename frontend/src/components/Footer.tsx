import { Calendar, Clock, DollarSign } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Tech Consulting
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Expert technical guidance to help you build scalable, production-ready infrastructure. 
              From cloud migrations to deployment automation.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-6">Quick Info</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300">Monday - Friday</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300">9AM - 5PM EST</span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300">$75/hour • Free 30min consultation</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-6">Core Services</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• DigitalOcean Migration</li>
              <li>• GitHub CI/CD Setup</li>
              <li>• Docker Containerization</li>
              <li>• Database Migration</li>
              <li>• Infrastructure Monitoring</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-700 pt-8 text-center">
          <p className="text-slate-400">
            © 2024 Tech Consulting Services. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
