
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCommunityPost, type CommunityPost } from '@/ai/flows/get-community-post-flow';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPost = async () => {
    setIsLoading(true);
    try {
      const newPost = await getCommunityPost();
      setPosts(prev => [...prev, newPost]);
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Failed to load community post',
        description: 'There was an issue with the AI. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial post
    fetchPost();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-3xl text-primary flex items-center gap-2">
          <Users className="h-8 w-8" />
          Community Showcase
        </h1>
      </header>

      <div className="space-y-4">
        {posts.map((post, index) => (
          <Card key={index} className="shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
               <Avatar className="h-10 w-10">
                <AvatarFallback style={{ backgroundColor: post.avatarColor }} className="text-lg font-bold text-primary/70">
                  {post.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle className="text-lg">{post.username}</CardTitle>
                <p className="text-xs text-muted-foreground">discovered a new plant!</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-full h-72 rounded-lg overflow-hidden border-2 border-primary/20 shadow-inner bg-green-100">
                <Image
                  src={post.imageDataUri}
                  alt={post.name}
                  width={300}
                  height={300}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-primary">{post.name}</h3>
                <p className="text-muted-foreground">{post.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button onClick={fetchPost} disabled={isLoading} className="w-full max-w-xs">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load More Posts'
          )}
        </Button>
      </div>
    </div>
  );
}
