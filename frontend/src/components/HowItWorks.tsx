import { Calendar, MessageSquare, Rocket } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: Calendar,
      title: "Book a Session",
      description: "Choose between a free 30-minute consultation or schedule paid expert sessions"
    },
    {
      icon: MessageSquare,
      title: "Get Expert Help",
      description: "Work directly with experienced engineers who understand your technical challenges"
    },
    {
      icon: Rocket,
      title: "Deploy Confidently",
      description: "Implement solutions with confidence knowing they're production-ready and scalable"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            How It Works
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Simple, straightforward process to get the technical expertise you need
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-indigo-200 -translate-x-10"></div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
