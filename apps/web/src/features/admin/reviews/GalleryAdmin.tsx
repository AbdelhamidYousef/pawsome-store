import type { AdminGalleryPhoto } from '@store/shared';
import { useState } from 'react';

import { Seo } from '../../../components/Seo';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/Toast';
import { FormAlert } from '../../auth/AuthCard';
import { adminErrorMessage } from '../errors';
import { useAdminProducts } from '../queries';

import {
  useAdminGallery,
  useCreateGalleryPhoto,
  useDeleteGalleryPhoto,
  useUpdateGalleryPhoto,
  useUploadGalleryFile,
} from './queries';

interface Linked {
  id: string;
  name: string;
}

// "Pawsome at home" gallery: photos that link to the products in them. Upload (or paste the path
// of a committed photo), say who is in it, link products with a name search, publish. Order is a
// number the shop edits with the up/down buttons (the two neighbours swap numbers).
export function GalleryAdmin() {
  const { data: photos, isPending, isError, refetch } = useAdminGallery();
  const update = useUpdateGalleryPhoto();
  const remove = useDeleteGalleryPhoto();
  const toast = useToast();

  const swap = async (a: AdminGalleryPhoto, b: AdminGalleryPhoto) => {
    // Equal numbers (the default 0) would make a swap a no-op, so renumber as a pair.
    const [first, second] = [
      Math.min(a.sortOrder, b.sortOrder),
      Math.max(a.sortOrder, b.sortOrder),
    ];
    const [low, high] = first === second ? [first, first + 1] : [first, second];
    try {
      await update.mutateAsync({
        id: a.id,
        input: { sortOrder: b.sortOrder === a.sortOrder ? high : b.sortOrder },
      });
      await update.mutateAsync({
        id: b.id,
        input: { sortOrder: low === a.sortOrder ? low : a.sortOrder },
      });
    } catch (error) {
      toast.show(adminErrorMessage(error), 'error');
    }
  };

  return (
    <section
      aria-labelledby="gallery-admin-heading"
      data-testid="admin-gallery"
      className="flex flex-col gap-4"
    >
      <Seo title="Customer gallery" noindex />
      <h2 id="gallery-admin-heading" className="font-display text-xl font-bold">
        Customer gallery
      </h2>
      <NewPhotoForm nextOrder={(photos?.length ?? 0) + 1} />

      {isError ? (
        <div role="alert" className="text-danger">
          We could not load the gallery.{' '}
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <Skeleton className="h-40 w-full rounded-card" />
      ) : photos.length === 0 ? (
        <p className="text-muted">No photos yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {photos.map((photo, i) => (
            <li
              key={photo.id}
              data-testid="admin-gallery-row"
              className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-3"
            >
              <img
                src={photo.path}
                alt=""
                className="h-20 w-20 shrink-0 rounded-control object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">
                  {photo.caption || '(no caption)'}{' '}
                  {photo.petName && (
                    <span className="font-normal text-muted">· {photo.petName}</span>
                  )}
                </p>
                <p className="text-sm text-muted">
                  Order {photo.sortOrder} · {photo.productIds.length} linked product
                  {photo.productIds.length === 1 ? '' : 's'}
                </p>
                <Badge tone={photo.published ? 'success' : 'neutral'}>
                  {photo.published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={i === 0}
                  aria-label={`Move ${photo.caption || 'photo'} up`}
                  onClick={() => void swap(photo, photos[i - 1]!)}
                >
                  Up
                </Button>
                <Button
                  variant="secondary"
                  disabled={i === photos.length - 1}
                  aria-label={`Move ${photo.caption || 'photo'} down`}
                  onClick={() => void swap(photo, photos[i + 1]!)}
                >
                  Down
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    update.mutate(
                      { id: photo.id, input: { published: !photo.published } },
                      { onError: (e) => toast.show(adminErrorMessage(e), 'error') },
                    )
                  }
                >
                  {photo.published ? 'Unpublish' : 'Publish'}
                  <span className="sr-only"> {photo.caption || 'photo'}</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!window.confirm('Delete this photo?')) return;
                    remove.mutate(photo.id, {
                      onSuccess: () => toast.show('Photo deleted', 'success'),
                      onError: (e) => toast.show(adminErrorMessage(e), 'error'),
                    });
                  }}
                >
                  Delete<span className="sr-only"> {photo.caption || 'photo'}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NewPhotoForm({ nextOrder }: { nextOrder: number }) {
  const create = useCreateGalleryPhoto();
  const upload = useUploadGalleryFile();
  const toast = useToast();
  const [path, setPath] = useState('');
  const [caption, setCaption] = useState('');
  const [petName, setPetName] = useState('');
  const [published, setPublished] = useState(true);
  const [linked, setLinked] = useState<Linked[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const search = useAdminProducts({ q: q.trim(), limit: 5 });

  const reset = () => {
    setPath('');
    setCaption('');
    setPetName('');
    setLinked([]);
    setQ('');
  };

  return (
    <form
      noValidate
      data-testid="gallery-form"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        create.mutate(
          {
            path,
            caption,
            petName,
            sortOrder: nextOrder,
            published,
            productIds: linked.map((l) => l.id),
          },
          {
            onSuccess: () => {
              reset();
              toast.show('Photo added', 'success');
            },
            onError: (err) => setError(adminErrorMessage(err)),
          },
        );
      }}
    >
      <h3 className="font-display text-lg font-bold">Add a photo</h3>
      <FormAlert message={error} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gallery-file" className="text-sm font-semibold">
          Upload a photo (JPEG, PNG or WebP, up to 3 MB)
        </label>
        <input
          id="gallery-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            upload.mutate(file, {
              onSuccess: setPath,
              onError: (err) => setError(adminErrorMessage(err)),
            });
          }}
        />
      </div>
      <Input
        label="Photo path"
        hint="Filled by an upload, or type the path of a committed photo such as /reviews/biscuit.webp."
        value={path}
        onChange={(e) => setPath(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <Input label="Pet name" value={petName} onChange={(e) => setPetName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Input
          label="Link products (search by name)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q.trim() && search.data && (
          <ul className="flex flex-wrap gap-2" aria-label="Search results">
            {search.data.data
              .filter((p) => !linked.some((l) => l.id === p.id))
              .map((p) => (
                <li key={p.id}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLinked([...linked, { id: p.id, name: p.name }])}
                  >
                    Add {p.name}
                  </Button>
                </li>
              ))}
          </ul>
        )}
        {linked.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Linked products">
            {linked.map((l) => (
              <li key={l.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${l.name}`}
                  onClick={() => setLinked(linked.filter((x) => x.id !== l.id))}
                >
                  {l.name} &times;
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Checkbox
        label="Publish straight away"
        checked={published}
        onChange={(e) => setPublished(e.target.checked)}
      />
      <div>
        <Button type="submit" loading={create.isPending}>
          Add photo
        </Button>
      </div>
    </form>
  );
}
