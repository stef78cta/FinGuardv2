import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getPostBySlug } from '@/content/blogPosts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowLeft, ChevronRight, AlertCircle } from 'lucide-react';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Blog FinGuard`;
    } else {
      document.title = 'Articol negăsit | Blog FinGuard';
    }
    window.scrollTo(0, 0);
  }, [post]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // 404 state
  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--newa-surface-canvas)]">
        <Navigation />
        <main className="section-padding">
          <div className="container-narrow text-center py-16">
            <AlertCircle className="w-16 h-16 text-[var(--newa-status-error)] mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-[var(--newa-text-primary)] mb-4">
              Articol negăsit
            </h1>
            <p className="text-[var(--newa-text-secondary)] mb-8">
              Ne pare rău, articolul pe care îl cauți nu există sau a fost mutat.
            </p>
            <Button asChild className="btn-primary">
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Înapoi la Blog
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const renderContent = (content: typeof post.content) => {
    return content.map((section, index) => {
      switch (section.type) {
        case 'heading':
          return (
            <h2 
              key={index} 
              className="text-xl font-semibold text-[var(--newa-text-primary)] mt-8 mb-4"
            >
              {section.text}
            </h2>
          );
        case 'paragraph':
          return (
            <p 
              key={index} 
              className="text-[var(--newa-text-secondary)] mb-4 leading-relaxed"
            >
              {section.text}
            </p>
          );
        case 'list':
          return (
            <ul key={index} className="space-y-2 mb-4 ml-4">
              {section.items?.map((item, idx) => (
                <li 
                  key={idx} 
                  className="flex items-start gap-2 text-[var(--newa-text-secondary)]"
                >
                  <span className="text-[var(--newa-brand-accent-indigo)] mt-1.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        case 'example':
          return (
            <div 
              key={index} 
              className="my-6 p-4 rounded-[var(--newa-radius-lg)] bg-[var(--newa-brand-accent-indigo)]/5 border-l-4 border-[var(--newa-brand-accent-indigo)]"
            >
              <p className="text-sm text-[var(--newa-text-secondary)] italic">
                {section.text}
              </p>
            </div>
          );
        default:
          return null;
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--newa-surface-canvas)]">
      <Navigation />
      
      <main className="section-padding">
        <article className="container-narrow">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--newa-text-tertiary)] mb-8">
            <Link 
              to="/blog" 
              className="hover:text-[var(--newa-brand-accent-indigo)] newa-focus-ring rounded transition-colors"
            >
              Blog
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[var(--newa-text-secondary)] truncate">{post.title}</span>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <Badge 
              variant="secondary" 
              className="mb-4 bg-[var(--newa-brand-accent-indigo)]/10 text-[var(--newa-brand-accent-indigo)]"
            >
              {post.category}
            </Badge>
            
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--newa-text-primary)] mb-4">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--newa-text-tertiary)]">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readingTime} citire
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 text-xs rounded-full bg-[var(--newa-surface-light)] text-[var(--newa-text-tertiary)] border border-[var(--newa-border-subtle)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </header>

          {/* Content */}
          <div className="prose-custom">
            {renderContent(post.content)}
          </div>

          {/* Disclaimer */}
          <div className="mt-12 p-4 rounded-[var(--newa-radius-lg)] bg-[var(--newa-surface-light)] border border-[var(--newa-border-subtle)]">
            <p className="text-sm text-[var(--newa-text-tertiary)]">
              <strong>Disclaimer:</strong> Acest articol oferă informații generale și nu constituie consultanță 
              financiară, contabilă sau juridică. Recomandăm consultarea unui specialist pentru situații specifice.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-[var(--newa-border-subtle)]">
            <Button asChild variant="outline" className="btn-ghost">
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Înapoi la Blog
              </Link>
            </Button>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
