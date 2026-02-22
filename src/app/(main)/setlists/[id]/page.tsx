export default async function SetlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1>Setlist Detail</h1>
      <p className="text-muted-foreground mt-2">
        Viewing setlist: {id}
      </p>
    </div>
  );
}
