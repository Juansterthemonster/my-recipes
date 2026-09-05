import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { toMins, fromMins } from './TimePicker'
import { compressImage } from '../utils/compressImage'
import { uploadToCloudinary } from '../utils/uploadToCloudinary'

// Generates a UUID, falling back to a manual v4 implementation when
// crypto.randomUUID isn't available — it requires a secure context (HTTPS or
// localhost), so it's missing when testing over the local network at a plain
// http://<lan-ip> address (e.g. from a phone during WiFi dev). Using this
// everywhere instead of calling crypto.randomUUID() directly means adding a
// photo — or saving a brand-new recipe — doesn't crash during that kind of testing.
function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Must match the MAX_PHOTOS check in Detail.jsx's handlePhotoUpload — same
// cap, enforced on both places a photo can be added to a recipe.
const MAX_PHOTOS = 6

// Buckets a recipe's flat `ingredients` array (each item optionally carrying
// a `group` string) into the shape the form edits: an array of named groups,
// each with its own ingredient rows. Groups are ordered by first appearance
// of their label, so a legacy recipe with no `group` keys at all collapses
// back into exactly one unlabeled group — identical to the pre-groups UI.
function groupsFromFlat(flat) {
  if (!flat?.length) {
    return [{ id: newId(), label: '', items: [{ name: '', amount: '', optional: false }] }]
  }
  const groups = []
  const byLabel = new Map()
  for (const item of flat) {
    const label = item.group || ''
    let g = byLabel.get(label)
    if (!g) {
      g = { id: newId(), label, items: [] }
      byLabel.set(label, g)
      groups.push(g)
    }
    g.items.push({ name: item.name, amount: item.amount, optional: item.optional || false })
  }
  return groups
}

/* ─── PHOTO UPLOAD CARD ─────────────────────────────────────────────────────── */
function PhotoGridUpload({ photos, onFilesAdded, onRemove, fileInputRef }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10,
        fontFamily: 'var(--font-body)',
      }}>{photos.length > 1 ? 'Photos' : 'Photo'}</label>

      {/* Hidden file input — accepts multiple photos at once */}
      <input
        ref={fileInputRef}
        type="file" accept="image/*" multiple
        onChange={onFilesAdded}
        style={{ display: 'none' }}
      />

      {photos.length > 0 ? (
        <div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="pill-row">
            {photos.map((p, i) => (
              <div key={p.key} style={{ position: 'relative', flex: '0 0 92px', borderRadius: 8, overflow: 'hidden' }}>
                <img
                  src={p.preview} alt={`Recipe photo ${i + 1}`}
                  style={{ width: 92, height: 92, objectFit: 'cover', display: 'block' }}
                />
                {i === 0 && (
                  <span style={{
                    position: 'absolute', bottom: 4, left: 4,
                    background: 'rgba(0,0,0,0.55)', color: '#fff',
                    fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em',
                    textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                  }}>Cover</span>
                )}
                <button
                  type="button" onClick={() => onRemove(p.key)}
                  aria-label="Remove photo"
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.55)', border: 'none',
                    borderRadius: '50%', width: 24, height: 24,
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.75)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button" onClick={() => fileInputRef.current?.click()}
                aria-label="Add another photo"
                style={{
                  flex: '0 0 92px', height: 92,
                  background: 'var(--cream)', border: '2px dashed var(--border)',
                  borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)', transition: 'border-color 150ms, color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--green-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 6, fontFamily: 'var(--font-body)' }}>
            {photos.length}/{MAX_PHOTOS} photos{photos.length > 1 ? ' — the first is used as the cover' : ''}
          </p>
        </div>
      ) : (
        <button
          type="button" onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', height: 120,
            background: 'var(--cream)', border: '2px dashed var(--border)',
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
            transition: 'border-color 150ms, color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-primary)'; e.currentTarget.style.color = 'var(--green-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span style={{ fontSize: '0.82rem' }}>Add photos</span>
        </button>
      )}
    </div>
  )
}

const inp = {
  width:'100%', background:'var(--white)', border:'1.5px solid var(--border)',
  borderRadius:8, fontFamily:'var(--font-body)', fontSize:'1rem',
  color:'var(--text-primary)', padding:'10px 14px', outline:'none',
  transition:'border-color 180ms'
}
const lbl = {
  display:'block', fontSize:'0.68rem', fontWeight:500, letterSpacing:'0.08em',
  textTransform:'uppercase', color:'var(--text-secondary)', marginBottom:6,
  fontFamily:'var(--font-body)'
}
const card = {
  background:'var(--white)', borderRadius:'var(--r-lg)',
  border:'1px solid var(--border-soft)', padding:'20px'
}

function focus(e) { e.target.style.borderColor = '#999' }
function blur(e)  { e.target.style.borderColor = 'var(--border)' }

function TimeBox({ val, onChange, unit }) {
  return (
    <div style={{ position:'relative', width:72 }}>
      <input
        type="number" min="0" value={val}
        onChange={e => onChange(e.target.value)}
        placeholder="0" onFocus={focus} onBlur={blur}
        style={{ ...inp, width:72, padding:'10px 22px 10px 10px', fontSize:'0.9rem' }}
      />
      <span style={{
        position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
        fontSize:'0.7rem', color:'var(--text-tertiary)', pointerEvents:'none'
      }}>{unit}</span>
    </div>
  )
}

/* ─── TIME + SERVES ───────────────────────────────────────────────────────────
   Order (v1.1 update): Serves | Prep time | Total time
   Grid template flips to [auto_1fr_1fr] so Serves (compact) comes first.
   Mobile: single column, stacked. sm+: 3-col side by side.
*/
function TimeSection({ aH, setAH, aM, setAM, tMinH, setTMinH, tMinM, setTMinM, serves, setServes }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-6 items-start">

      {/* Serves — first, compact auto-width column */}
      <div>
        <label style={lbl}>Serves</label>
        <p style={{ fontSize:'0.68rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', marginBottom:10 }}>
          Portions
        </p>
        <input
          type="number" min="1" value={serves}
          onChange={e => setServes(e.target.value)}
          placeholder="—" onFocus={focus} onBlur={blur}
          style={{ ...inp, width:72, padding:'10px 10px', fontSize:'0.9rem', textAlign:'center' }}
        />
      </div>

      {/* Prep time — second */}
      <div>
        <label style={lbl}>Prep time</label>
        <p style={{ fontSize:'0.68rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', marginBottom:10 }}>
          Hands-on cooking
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <TimeBox val={aH} onChange={setAH} unit="h" />
          <TimeBox val={aM} onChange={setAM} unit="m" />
        </div>
      </div>

      {/* Total time — third */}
      <div>
        <label style={lbl}>Total time</label>
        <p style={{ fontSize:'0.68rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', marginBottom:10 }}>
          From start to finish
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <TimeBox val={tMinH} onChange={setTMinH} unit="h" />
          <TimeBox val={tMinM} onChange={setTMinM} unit="m" />
        </div>
      </div>

    </div>
  )
}

export default function RecipeForm({ recipe, onBack, onSave, session }) {
  const isEdit = !!recipe
  const [name, setName]               = useState(recipe?.name || '')
  const [description, setDescription] = useState(recipe?.description || '')

  const ai = fromMins(recipe?.active_time_mins)
  const ti = fromMins(recipe?.total_time_min)
  const [aH, setAH]       = useState(ai.hours   || '')
  const [aM, setAM]       = useState(ai.minutes || '')
  const [tMinH, setTMinH] = useState(ti.hours   || '')
  const [tMinM, setTMinM] = useState(ti.minutes || '')
  const [serves, setServes]   = useState(recipe?.serves  || '')
  const [cuisine, setCuisine] = useState(recipe?.cuisine || '')
  // Single-select: dietary is one string (or '' for none). DB still receives an array.
  const [dietary, setDietary] = useState(recipe?.dietary?.[0] || '')
  const [mealType, setMealType] = useState(
    Array.isArray(recipe?.meal_type) ? recipe.meal_type
    : recipe?.meal_type ? [recipe.meal_type]
    : []
  )
  const [ingredientGroups, setIngredientGroups] = useState(() => groupsFromFlat(recipe?.ingredients))
  const [steps, setSteps]     = useState(recipe?.steps?.join('\n') || '')
  const [isPublic, setIsPublic] = useState(recipe?.is_public || false)
  const initialPhotoUrls = recipe?.photos?.length ? recipe.photos : (recipe?.photo_url ? [recipe.photo_url] : [])
  const [photos, setPhotos] = useState(
    initialPhotoUrls.map((url, i) => ({ key: `existing-${i}`, url, file: null, preview: url }))
  )
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const ingRefs        = useRef({})  // keyed by "groupIdx:itemIdx"
  const pendingFocusRef = useRef(null)

  // After a new ingredient row is committed to the DOM, focus its name input
  // and scroll it into view — without jarring scroll jumps.
  useEffect(() => {
    if (pendingFocusRef.current === null) return
    const idx = pendingFocusRef.current
    pendingFocusRef.current = null
    const el = ingRefs.current[idx]
    if (el) {
      el.focus({ preventScroll: true })
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
  const fileInputRef = useRef(null)

  function handlePhotosAdded(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPhotos(p => {
      const room = MAX_PHOTOS - p.length
      if (room <= 0) return p
      return [
        ...p,
        ...files.slice(0, room).map(file => ({
          key: newId(), url: null, file, preview: URL.createObjectURL(file),
        })),
      ]
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhotoAt(key) {
    setPhotos(p => p.filter(ph => ph.key !== key))
  }

  function updateIng(gi, ii, field, value) {
    setIngredientGroups(gs => {
      const next = [...gs]
      const items = [...next[gi].items]
      items[ii] = { ...items[ii], [field]: value }
      next[gi] = { ...next[gi], items }
      return next
    })
  }
  function addIng(gi) {
    pendingFocusRef.current = `${gi}:${ingredientGroups[gi].items.length}`  // key the new row will get
    setIngredientGroups(gs => {
      const next = [...gs]
      next[gi] = { ...next[gi], items: [...next[gi].items, { name:'', amount:'', optional:false }] }
      return next
    })
  }
  function removeIng(gi, ii) {
    setIngredientGroups(gs => {
      if (gs[gi].items.length <= 1) return gs
      const next = [...gs]
      next[gi] = { ...next[gi], items: next[gi].items.filter((_, idx) => idx !== ii) }
      return next
    })
  }
  function updateGroupLabel(gi, label) {
    setIngredientGroups(gs => {
      const next = [...gs]
      next[gi] = { ...next[gi], label }
      return next
    })
  }
  function addGroup() {
    setIngredientGroups(gs => [...gs, { id: newId(), label: '', items: [{ name:'', amount:'', optional:false }] }])
  }
  function removeGroup(gi) {
    setIngredientGroups(gs => gs.length > 1 ? gs.filter((_, idx) => idx !== gi) : gs)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Please add a recipe name.'); return }
    setSaving(true); setError('')

    // For new recipes, generate the UUID now so the storage path and DB row
    // share the same ID from the start — photo can never be matched to the
    // wrong recipe even if something goes wrong mid-save.
    const recipeId = isEdit ? recipe.id : newId()

    // Upload any newly-added photos — compress to WebP first. Existing
    // (already-uploaded) photos just carry their URL straight through, in
    // the order they appear — the first photo is always the cover.
    const finalPhotos = []
    for (const p of photos) {
      if (p.url) { finalPhotos.push(p.url); continue }
      const compressed = await compressImage(p.file)
      try {
        finalPhotos.push(await uploadToCloudinary(compressed, recipeId))
      } catch (e) {
        console.error('Photo upload failed:', e)
        setError('Failed to upload one or more photos. Please try again.')
        setSaving(false)
        return
      }
    }

    const payload = {
      name: name.trim(), description: description.trim() || null,
      active_time_mins: toMins(aH, aM),
      total_time_min:   toMins(tMinH, tMinM),
      total_time_max:   null,
      serves:  serves  ? parseInt(serves)  : null,
      cuisine: cuisine.trim() || null,
      dietary: dietary ? [dietary] : [],
      meal_type: mealType.length > 0 ? mealType : null,
      ingredients: ingredientGroups.flatMap(g => {
        const label = g.label.trim() || null
        return g.items.filter(i => i.name.trim()).map(i => ({
          name: i.name.trim(), amount: i.amount.trim(), optional: i.optional || false, group: label,
        }))
      }),
      steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
      is_public: isPublic,
      photos: finalPhotos,
      photo_url: finalPhotos[0] || null,
    }
    let err
    if (isEdit) {
      // Mark as modified if this recipe was copied from a public one
      if (recipe.copied_from) payload.is_modified = true
      ;({ error:err } = await supabase.from('recipes').update(payload).eq('id', recipe.id))
    } else {
      ({ error:err } = await supabase.from('recipes').insert({ ...payload, id: recipeId, user_id: session.user.id }))
    }
    setSaving(false)
    if (err) {
      console.error('Save recipe failed:', err)
      setError('Something went wrong. Please try again.')
      return
    }
    onSave()
  }

  return (
    <div className="min-h-screen" style={{ background:'#F9F6F0' }}>

      {/* Nav — matches app background, Dark Teal text/buttons */}
      <div
        style={{ background: '#F9F6F0' }}
        className="
          px-5 py-[14px] flex items-center justify-between sticky top-0 z-10
          lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
          lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
          lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        "
      >
        {/* Title — left */}
        <span style={{
          fontFamily:'var(--font-body)', fontSize:'1.1rem',
          fontWeight:600, color:'#0C3D4E'
        }}>{isEdit ? 'Edit recipe' : 'New recipe'}</span>

        {/* Cancel + Save — right, together */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Cancel — secondary: Dark Teal outline */}
          <button onClick={onBack} style={{
            background:'transparent', color:'#0C3D4E',
            border:'1.5px solid #0C3D4E',
            borderRadius:'var(--r-full)', fontFamily:'var(--font-body)',
            fontSize:'0.82rem', fontWeight:400, padding:'9px 22px',
            cursor:'pointer',
          }}>Cancel</button>

          {/* Save — primary: Dark Teal fill */}
          <button onClick={handleSave} disabled={saving}
            style={{
              background:'#0C3D4E', color:'#FFFFFF',
              border:'none', borderRadius:'var(--r-full)',
              fontFamily:'var(--font-body)', fontSize:'0.82rem',
              fontWeight:600, padding:'9px 22px',
              cursor:'pointer', opacity: saving ? 0.6 : 1,
            }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Form body ──────────────────────────────────────────────────────────
          Mobile:  single column, top-to-bottom
          Desktop: two columns — metadata left, content right (v1.1)
            Left:  Name + Notes · Cuisine / Dietary / Meal type · Time + Serves
            Right: Ingredients · Steps
      */}
      <div className="mx-4 mt-4 pb-10 lg:mx-10">
        {/* Error — Ruby Red (#a31621) is reserved exclusively for error/danger states */}
        {error && (
          <div style={{
            background:'#fdf2f3', border:'1px solid #f5baba', color:'#a31621',
            fontSize:'0.85rem', padding:'12px 16px', borderRadius:8,
            fontFamily:'var(--font-body)', marginBottom:12
          }}>{error}</div>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-5 lg:items-start">

          {/* ── LEFT COLUMN (metadata) ── */}
          <div className="flex flex-col gap-3">

            {/* Name + Notes */}
            <div style={card} className="space-y-4">
              <div>
                <label style={lbl}>Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Recipe name" style={inp} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Any context, variations, or reminders…" rows={3}
                  style={{ ...inp, resize:'none', lineHeight:1.6 }} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            {/* Photo — below name/notes */}
            <div style={card}>
              <PhotoGridUpload
                photos={photos}
                onFilesAdded={handlePhotosAdded}
                onRemove={removePhotoAt}
                fileInputRef={fileInputRef}
              />
            </div>

            {/* Cuisine + Dietary + Meal type */}
            <div style={card}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Cuisine</label>
                <input type="text" value={cuisine} onChange={e => setCuisine(e.target.value)}
                  placeholder="e.g. Italian, Indian, Japanese…"
                  style={inp} onFocus={focus} onBlur={blur} />
              </div>
              {/* Dietary — Amber Gold active state, single-select (radio behaviour).
                  Clicking an active option deselects it; clicking another replaces it.
                  DB receives a one-item array (or empty) to stay schema-compatible. */}
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Dietary</label>
                <p style={{ fontSize:'0.72rem', color:'var(--text-tertiary)', fontFamily:'var(--font-body)', marginBottom:8, marginTop:2 }}>
                  Select one
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {['Vegetarian','Vegan','Pescatarian','Gluten free','Keto'].map(opt => {
                    const active = dietary === opt
                    return (
                      <button key={opt} type="button"
                        onClick={() => setDietary(active ? '' : opt)}
                        style={{
                          padding:'6px 14px', borderRadius:'var(--r-full)',
                          fontFamily:'var(--font-body)', fontSize:'0.78rem',
                          fontWeight: active ? 600 : 400, cursor:'pointer', transition:'all 180ms',
                          border:     active ? '1.5px solid #F1C203' : '1.5px solid var(--border)',
                          background: active ? '#FEFAD6'             : 'var(--white)',
                          color:      active ? '#6B4F00'             : 'var(--text-secondary)',
                        }}
                      >{opt}</button>
                    )
                  })}
                </div>
              </div>

              {/* Meal type — Graphite active state (#2c302e) */}
              <div>
                <label style={lbl}>Meal type</label>
                <p style={{ fontSize:'0.72rem', color:'var(--text-tertiary)', fontFamily:'var(--font-body)', marginBottom:8, marginTop:2 }}>
                  Select all that apply
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {['Breakfast','Lunch','Dinner','Dessert','Snack','Side'].map(opt => {
                    const active = mealType.includes(opt)
                    return (
                      <button key={opt} type="button"
                        onClick={() => setMealType(active ? mealType.filter(m => m !== opt) : [...mealType, opt])}
                        style={{
                          padding:'6px 14px', borderRadius:'var(--r-full)',
                          fontFamily:'var(--font-body)', fontSize:'0.78rem',
                          fontWeight: active ? 600 : 400, cursor:'pointer', transition:'all 180ms',
                          border:     active ? '1.5px solid #2c302e' : '1.5px solid var(--border)',
                          background: active ? '#f2f3f2'             : 'var(--white)',
                          color:      active ? '#2c302e'             : 'var(--text-secondary)',
                        }}
                      >{opt}</button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Time + Serves */}
            <div style={card}>
              <TimeSection
                aH={aH} setAH={setAH} aM={aM} setAM={setAM}
                tMinH={tMinH} setTMinH={setTMinH} tMinM={tMinM} setTMinM={setTMinM}
                serves={serves} setServes={setServes}
              />
            </div>

          </div>
          {/* ── end LEFT COLUMN ── */}

          {/* ── RIGHT COLUMN (content) — mt-3 on mobile, no margin on desktop ── */}
          <div className="flex flex-col gap-3 mt-3 lg:mt-0">

            {/* Ingredients
                CSS Grid for the input rows (v1.1): all Name columns align, all
                Amount columns align, remove buttons align — cleaner than per-row flex.
                gridColumn:'1 / -1' on the optional label spans all three columns.

                Groups (v4): ingredientGroups is normally a single unlabeled
                group and the form looks exactly like the pre-groups UI — the
                group-name field and "Remove group" control only appear once
                there's more than one group, so a simple recipe's form is
                unchanged until you actually add a second list.
            */}
            <div style={card}>
              <label style={{ ...lbl, marginBottom:16 }}>Ingredients</label>

              <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                {ingredientGroups.map((group, gi) => (
                  <div key={group.id}>
                    {ingredientGroups.length > 1 && (
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <input
                          type="text" value={group.label}
                          onChange={e => updateGroupLabel(gi, e.target.value)}
                          placeholder={`Group ${gi + 1} name (e.g. Sauce)`}
                          style={{ ...inp, fontSize:'0.82rem', padding:'7px 10px', fontWeight:600, flex:1 }}
                          onFocus={focus} onBlur={blur}
                        />
                        <button type="button" onClick={() => removeGroup(gi)}
                          style={{ fontSize:'0.72rem', color:'var(--text-tertiary)', background:'none',
                            border:'none', cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}
                          onMouseEnter={e => e.target.style.color='var(--text-secondary)'}
                          onMouseLeave={e => e.target.style.color='var(--text-tertiary)'}>
                          Remove group
                        </button>
                      </div>
                    )}

                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {group.items.map((ing, ii) => (
                        <div key={ii}>
                          <div style={{
                            display:'grid',
                            gridTemplateColumns:'1fr 82px 22px',
                            columnGap:6,
                            alignItems:'center',
                          }}>
                            <input
                              ref={el => ingRefs.current[`${gi}:${ii}`] = el}
                              type="text" value={ing.name}
                              onChange={e => updateIng(gi, ii, 'name', e.target.value)}
                              placeholder="Ingredient"
                              style={{ ...inp, fontSize:'0.9rem', padding:'9px 11px' }}
                              onFocus={focus} onBlur={blur}
                            />
                            <input
                              type="text" value={ing.amount}
                              onChange={e => updateIng(gi, ii, 'amount', e.target.value)}
                              placeholder="Amount"
                              style={{ ...inp, fontSize:'0.9rem', padding:'9px 11px' }}
                              onFocus={focus} onBlur={blur}
                            />
                            {group.items.length > 1 ? (
                              <button onClick={() => removeIng(gi, ii)} style={{
                                color:'var(--border)', background:'none', border:'none',
                                cursor:'pointer', fontSize:'1.2rem', lineHeight:1,
                                width:22, flexShrink:0, textAlign:'center'
                              }}>×</button>
                            ) : <div />}
                          </div>
                          <label style={{
                            display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                            width:'fit-content', marginLeft:2, marginTop:8
                          }}>
                            <input type="checkbox" checked={ing.optional || false}
                              onChange={e => updateIng(gi, ii, 'optional', e.target.checked)}
                              style={{ width:16, height:16, accentColor:'var(--green-primary)', cursor:'pointer', flexShrink:0 }} />
                            <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)' }}>
                              Optional
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={() => addIng(gi)}
                      style={{ marginTop:12, fontSize:'0.82rem', color:'var(--text-secondary)',
                        background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}
                      onMouseEnter={e => e.target.style.color='var(--green-primary)'}
                      onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
                      + Add ingredient
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addGroup}
                style={{
                  marginTop:20, fontSize:'0.78rem', color:'var(--text-tertiary)',
                  background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)',
                  borderTop:'1px dashed var(--border-soft)', paddingTop:14, width:'100%', textAlign:'left',
                }}
                onMouseEnter={e => e.target.style.color='var(--green-primary)'}
                onMouseLeave={e => e.target.style.color='var(--text-tertiary)'}>
                + Add ingredient group (e.g. "Sauce", "Marinade")
              </button>
            </div>

            {/* Steps */}
            <div style={card}>
              <label style={lbl}>Steps</label>
              <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={6}
                placeholder={"Write each step on a new line…\n\nBoil pasta in salted water\nFry garlic in olive oil\nToss together and serve"}
                style={{ ...inp, resize:'none', lineHeight:1.65 }} onFocus={focus} onBlur={blur}
              />
              <p style={{ fontSize:'0.72rem', color:'var(--text-tertiary)', marginTop:6, fontFamily:'var(--font-body)' }}>
                Each line becomes a numbered step
              </p>
            </div>

          </div>
          {/* ── end RIGHT COLUMN ── */}

        </div>

        {/* Make recipe public — last section; matches two-column width on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-5" style={{ marginTop: 12 }}>
        <div style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...lbl, marginBottom:2 }}>Make recipe public</div>
            <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', margin:0, lineHeight:1.5 }}>
              Anyone using the app will be able to see and add this recipe to their own recipes
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(p => !p)}
            aria-label={isPublic ? 'Make private' : 'Make public'}
            style={{
              width:44, height:26, borderRadius:13, flexShrink:0,
              background: isPublic ? 'var(--green-primary)' : 'var(--border)',
              border:'none', cursor:'pointer', position:'relative',
              transition:'background 200ms',
            }}
          >
            <span style={{
              position:'absolute', top:3,
              left: isPublic ? 21 : 3,
              width:20, height:20, borderRadius:'50%',
              background:'#FFFFFF',
              transition:'left 200ms',
              boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
        </div>{/* end two-column wrapper */}

        {/* Bottom actions removed — Cancel + Save live in the sticky nav header */}
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
