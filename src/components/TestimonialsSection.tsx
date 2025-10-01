import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import mariaImage from '../assets/testimonial-maria.jpg';
import andreiImage from '../assets/testimonial-andrei.jpg';
import elenaImage from '../assets/testimonial-elena.jpg';

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      quote: "FinGuard mi-a redus timpul de analiză de la 6 ore la 5 minute. Acum pot lua decizii de investiții în aceeași zi.",
      author: "Maria Popescu",
      role: "CFO",
      company: "TechSolutions SRL (150 angajați)",
      image: mariaImage,
    },
    {
      quote: "Ca antreprenor fără background financiar, FinGuard îmi oferă claritatea de care am nevoie fără să angajez un CFO full-time.",
      author: "Andrei Ionescu",
      role: "Fondator",
      company: "GreenLogistics (€2M cifră afaceri)",
      image: andreiImage,
    },
    {
      quote: "Gestionăm 25 de clienți și FinGuard ne-a crescut eficiența cu 70%. Rapoartele sunt atât de clare încât clienții înțeleg instant.",
      author: "Elena Dumitrescu",
      role: "Partner",
      company: "Contabilitate Pro",
      image: elenaImage,
    },
  ];

  const stats = [
    { value: "500+", label: "companii" },
    { value: "50K+", label: "analize procesate" },
    { value: "4.8/5", label: "rating" },
    { value: "99.3%", label: "acuratețe" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section 
      id="testimonials"
      ref={sectionRef}
      className="section-padding-reduced bg-white border-t border-gray-100"
    >
      <div className="container-custom">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="subheadline text-gray-900 mb-6">
            Folosit de companiile care iau decizii bazate pe date
          </h2>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-4xl mx-auto mb-20">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 px-4">
                  <div className="card-testimonial text-center">
                    <Quote className="w-12 h-12 text-indigo-500 mx-auto mb-6" />
                    
                    <blockquote className="body-large text-gray-700 mb-8 italic leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    <div className="flex items-center justify-center space-x-4">
                      <img 
                        src={testimonial.image}
                        alt={`${testimonial.author} - ${testimonial.role}`}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                      />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">
                          {testimonial.author}
                        </div>
                        <div className="text-sm text-gray-600">
                          {testimonial.role}
                        </div>
                        <div className="text-sm text-gray-500">
                          {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-medium border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-medium border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Indicators */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  index === currentIndex ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div 
          className={`border-t border-gray-100 pt-16 ${
            isVisible ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Stat 1 */}
            <div className="text-center space-y-3">
              <div className="text-4xl font-bold gradient-text">500+</div>
              <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">companii</div>
              <p className="text-sm text-gray-600 leading-relaxed px-4">
                au încredere în analiza noastră pentru decizii mai rapide
              </p>
            </div>

            {/* Stat 2 */}
            <div className="text-center space-y-3">
              <div className="text-4xl font-bold text-emerald-600">&lt; 1 minut</div>
              <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Viteză de analiză</div>
              <p className="text-sm text-gray-600 leading-relaxed px-4">
                rezultate financiare clare, fără fișiere Excel complicate
              </p>
            </div>

            {/* Stat 3 */}
            <div className="text-center space-y-3">
              <div className="text-4xl font-bold text-amber-600">€250k+</div>
              <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Economii reale</div>
              <p className="text-sm text-gray-600 leading-relaxed px-4">
                clienții noștri au redus drastic costurile de consultanță
              </p>
            </div>
          </div>

          {/* Final Benefit */}
          <div className="text-center pt-8 border-t border-gray-100">
            <p className="text-base md:text-lg text-gray-700 font-medium italic leading-relaxed max-w-3xl mx-auto">
              „Alătură-te liderilor care au trecut deja la o soluție modernă de Financial Planning and Analysis"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;