import { Button } from '@/components/ui/button';
import { ArrowRight, Clock } from 'lucide-react';

const Hero = () => {
  const scrollToBooking = () => {
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
      <div className="relative container mx-auto px-6 py-24 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">Free 30-min consultation for first-timers</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent leading-tight">
            Tech Expertise
            <br />
            On-Demand
          </h1>
          
          <p className="text-xl lg:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your infrastructure with expert guidance. From cloud migrations to deployment automation, 
            we help you setup and migrate to more affordable, scalable, production-ready systems.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              onClick={scrollToBooking}
              size="lg" 
              className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Book Free Session
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <Button 
              onClick={scrollToServices}
              variant="outline" 
              size="lg"
              className="bg-blue-500 border-white/30 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
            >
              Explore Services
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-emerald-400 mb-2">Mon-Fri</div>
              <div className="text-blue-100">9AM - 5PM Available</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-blue-400 mb-2">$75/hr</div>
              <div className="text-blue-100">Professional Consulting</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-purple-400 mb-2">11+</div>
              <div className="text-blue-100">Core Services</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
