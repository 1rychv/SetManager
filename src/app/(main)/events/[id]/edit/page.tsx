export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1>Edit Event</h1>
      <p className="text-muted-foreground mt-2">
        Editing event: {id}
      </p>
    </div>
  );
}
