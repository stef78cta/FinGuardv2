import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/marketing/PageShell';
import { blogPosts, categories } from '@/content/blogPosts';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Clock, ArrowRight } from 'lucide-react';

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <PageShell
      title="Blog Financiar"
      heroTitle="Blog Financiar"
      heroSubtitle="Articole practice despre contabilitate, raportare și control financiar."
    >
      {/* Filters */}
      <div className="mb-12 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--newa-text-tertiary)]" />
          <Input
            type="text"
            placeholder="Caută articole..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Toate categoriile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate categoriile</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-[var(--newa-text-tertiary)] mb-6">
        {filteredPosts.length} {filteredPosts.length === 1 ? 'articol găsit' : 'articole găsite'}
      </p>

      {/* Posts Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group card-feature p-6 flex flex-col hover:shadow-lg transition-shadow newa-focus-ring"
            >
              <Badge 
                variant="secondary" 
                className="w-fit mb-4 bg-[var(--newa-brand-accent-indigo)]/10 text-[var(--newa-brand-accent-indigo)] hover:bg-[var(--newa-brand-accent-indigo)]/20"
              >
                {post.category}
              </Badge>
              
              <h2 className="text-lg font-semibold text-[var(--newa-text-primary)] mb-2 group-hover:text-[var(--newa-brand-accent-indigo)] transition-colors">
                {post.title}
              </h2>
              
              <p className="text-sm text-[var(--newa-text-secondary)] mb-4 flex-1 line-clamp-3">
                {post.excerpt}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-[var(--newa-border-subtle)]">
                <div className="flex items-center gap-4 text-xs text-[var(--newa-text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(post.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readingTime}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--newa-text-tertiary)] group-hover:text-[var(--newa-brand-accent-indigo)] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[var(--newa-text-secondary)] mb-4">
            Nu am găsit articole care să corespundă căutării tale.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-[var(--newa-brand-accent-indigo)] hover:underline newa-focus-ring rounded"
          >
            Resetează filtrele
          </button>
        </div>
      )}
    </PageShell>
  );
};

export default Blog;
