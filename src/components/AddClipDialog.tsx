import { useState, useRef } from 'react';
import { Upload, Plus, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VideoClip } from '@/types/basketball';

interface AddClipDialogProps {
  onAddClip: (clip: Omit<VideoClip, 'id'>) => void;
}

export function AddClipDialog({ onAddClip }: AddClipDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;

    onAddClip({
      title: title || 'Untitled Clip',
      description,
      url: videoUrl,
      date: new Date().toISOString(),
    });

    setOpen(false);
    setTitle('');
    setDescription('');
    setVideoFile(null);
    setVideoUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Upload Clip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload Video Clip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {videoFile ? (
              <div className="space-y-2">
                <Video className="w-10 h-10 mx-auto text-primary" />
                <p className="text-sm font-medium">{videoFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload video
                </p>
                <p className="text-xs text-muted-foreground">
                  MP4, MOV, or WebM
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Game-winning shot vs Eagles"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context about this clip..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={!videoUrl}
            className="w-full gradient-primary font-semibold"
          >
            Upload Clip
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
