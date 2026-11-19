export function directoryErrorMessage(status: number): string {
  if (status === 403)
    return 'Tsy manana alalana hijery ireo angona ireo ianao. Mifandraisa amin’ny mpitantana hanamarina ny andraikitrao. (403)';
  if (status === 404)
    return 'Tsy hita ny angona na ny tolotra nangatahana. Hamarino ny adiresy sy ny kinovan’ny API. (404)';
  if (status >= 500) return `Misy olana amin’ny mpizara. Andramo indray afaka kelikely. (${status})`;
  return `Tsy azo vakina ny angona. Andramo indray. (${status})`;
}
