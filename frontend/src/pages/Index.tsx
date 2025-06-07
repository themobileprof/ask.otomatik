import Layout from '@/components/Layout';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import Booking from '@/components/Booking';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Hero />
        <Booking />
        <Services />
        <FAQ />
        <Footer />
      </div>
    </Layout>
  );
};

export default Index;
