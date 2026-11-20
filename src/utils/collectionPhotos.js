import { supabase } from '../supabase'

// Every photo (cover + extras) from the recipes in a collection, de-duplicated, in order.
// Used by the cover pickers.
export async function loadCollectionPhotos(collectionId) {
  const { data } = await supabase
    .from('collection_recipes')
    .select('recipes(photo_url, photos)')
    .eq('collection_id', collectionId)
  const urls = []
  for (const row of data || []) {
    const r = row.recipes
    if (!r) continue
    const list = r.photos?.length ? r.photos : (r.photo_url ? [r.photo_url] : [])
    for (const u of list) if (u && !urls.includes(u)) urls.push(u)
  }
  return urls
}
