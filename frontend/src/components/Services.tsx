import { Cloud, Github, Server, Database, Container, Globe, Search } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: Cloud,
      title: "DigitalOcean Migration",
      description: "Seamless migration to DigitalOcean with zero downtime and optimized performance"
    },
    {
      icon: Github,
      title: "GitHub CI/CD",
      description: "Automated deployment pipelines with GitHub Actions for continuous integration"
    },
    {
      icon: Server,
      title: "Cloud VM Setup",
      description: "Complete virtual machine configuration, monitoring, and maintenance"
    },
    {
      icon: Server,
      title: "Application Deployment",
      description: "Production-ready application deployment with best practices and security"
    },
    {
      icon: Database,
      title: "Database Migration",
      description: "Safe database setup, migration, and optimization for peak performance"
    },
    {
      icon: Container,
      title: "Docker Containerization",
      description: "Container orchestration and deployment on virtual machines"
    },
    {
      icon: Globe,
      title: "Domain Management",
      description: "DNS configuration, SSL certificates, and domain optimization"
    },
    {
      icon: Server,
      title: "Application Architecture",
      description: "Scalable system design and architecture planning for growth"
    },
    {
      icon: Search,
      title: "Technical SEO",
      description: "Performance optimization and technical SEO implementation"
    },
    {
      icon: Search,
      title: "Google Analytics",
      description: "Analytics setup, tracking implementation, and performance monitoring"
    },
    {
      icon: Server,
      title: "Resource Monitoring",
      description: "Comprehensive server monitoring and alerting systems"
    }
  ];

  return (
    <section id="services" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Our Services
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Comprehensive technical solutions to scale your business infrastructure
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-blue-200 group">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{service.title}</h3>
              <p className="text-slate-600 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
