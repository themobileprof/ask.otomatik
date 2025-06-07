import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ = () => {
  const faqs = [
    {
      question: "Who is this service for?",
      answer: "Perfect for startups, small to medium businesses, and development teams who need expert technical guidance without hiring full-time infrastructure engineers. Whether you're scaling up or solving complex deployment challenges, we're here to help."
    },
    {
      question: "What tools and technologies do you work with?",
      answer: "We specialize in DigitalOcean, GitHub Actions, Docker, various databases (PostgreSQL, MySQL, MongoDB), domain management, SEO tools, Google Analytics, and comprehensive monitoring solutions. Our expertise covers the entire modern web infrastructure stack."
    },
    {
      question: "Can I book multiple hours or recurring sessions?",
      answer: "Absolutely! You can book multiple consecutive hours or schedule recurring sessions. We recommend booking with 1-hour gaps between sessions to ensure proper preparation and follow-up documentation."
    },
    {
      question: "What happens during the free consultation?",
      answer: "We'll assess your current infrastructure, understand your challenges, and provide initial recommendations. This 30-minute session helps us understand your needs and shows you how we can help with your specific technical challenges."
    },
    {
      question: "Do you provide follow-up support?",
      answer: "Yes! All paid sessions include follow-up documentation and a brief email summary. For ongoing support, you can schedule additional sessions or we can discuss retainer arrangements for larger projects."
    },
    {
      question: "What if I need help outside business hours?",
      answer: "Our scheduled sessions are Monday-Friday, 9AM-5PM. However, for urgent production issues or special arrangements, we can discuss emergency support options during your consultation."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Everything you need to know about our consulting services
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-slate-200 rounded-2xl px-6 bg-slate-50 hover:bg-slate-100 transition-colors duration-300">
                <AccordionTrigger className="text-left text-lg font-semibold text-slate-900 py-6 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-base leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
