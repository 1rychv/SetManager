export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1>Event Detail</h1>
      <p className="text-muted-foreground mt-2">
        Viewing event: {id}
      </p>
    </div>
  );
}
