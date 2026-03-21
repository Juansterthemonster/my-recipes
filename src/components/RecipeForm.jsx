import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { toMins, fromMins } from './TimePicker'

/* ─── PHOTO UPLOAD CARD ─────────────────────────────────────────────────────── */
function PhotoUpload({ preview, onFileChange, onRemove, fileInputRef }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10,
        fontFamily: 'var(--font-body)',
      }}>Photo</label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file" accept="image/*"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div>
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
            <img
              src={preview} alt="Recipe photo"
              style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            />
            <button
              type="button" onClick={onRemove}
              aria-label="Remove photo"
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.55)', border: 'none',
                borderRadius: '50%', width: 32, height: 32,
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.75)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
          <button
            type="button" onClick={() => fileInputRef.current?.click()}
            style={{
              marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', padding: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--green-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >Change photo</button>
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
          <span style={{ fontSize: '0.82rem' }}>Add a photo</span>
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
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients?.length ? recipe.ingredients : [{ name:'', amount:'', optional:false }]
  )
  const [steps, setSteps]     = useState(recipe?.steps?.join('\n') || '')
  const [isPublic, setIsPublic] = useState(recipe?.is_public || false)
  const [photoUrl, setPhotoUrl]       = useState(recipe?.photo_url || null)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(recipe?.photo_url || null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const ingRefs        = useRef([])
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

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function updateIng(i, field, value) {
    const u = [...ingredients]; u[i] = { ...u[i], [field]:value }; setIngredients(u)
  }
  function addIng() {
    pendingFocusRef.current = ingredients.length  // index the new row will get
    setIngredients(p => [...p, { name:'', amount:'', optional:false }])
  }
  function removeIng(i) {
    if (ingredients.length > 1) setIngredients(ingredients.filter((_,idx) => idx !== i))
  }

  async function handleSave() {
    if (!name.trim()) { setError('Please add a recipe name.'); return }
    setSaving(true); setError('')

    // Upload new photo if one was selected
    let finalPhotoUrl = photoUrl
    if (photoFile) {
      const ext = photoFile.name.split('.').pop().toLowerCase()
      const path = `${session.user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('recipe-photos')
        .upload(path, photoFile, { upsert: true })
      if (uploadErr) { setError('Failed to upload photo. Please try again.'); setSaving(false); return }
      const { data: { publicUrl } } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(path)
      finalPhotoUrl = publicUrl
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
      ingredients: ingredients.filter(i => i.name.trim()).map(i => ({
        name: i.name.trim(), amount: i.amount.trim(), optional: i.optional || false
      })),
      steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
      is_public: isPublic,
      photo_url: finalPhotoUrl,
    }
    let err
    if (isEdit) {
      // Mark as modified if this recipe was copied from a public one
      if (recipe.copied_from) payload.is_modified = true
      ;({ error:err } = await supabase.from('recipes').update(payload).eq('id', recipe.id))
    } else {
      ({ error:err } = await supabase.from('recipes').insert({ ...payload, user_id: session.user.id }))
    }
    setSaving(false)
    if (err) { setError('Something went wrong. Please try again.'); return }
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
              <PhotoUpload
                preview={photoPreview}
                onFileChange={handlePhotoChange}
                onRemove={removePhoto}
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
            */}
            <div style={card}>
              <label style={{ ...lbl, marginBottom:16 }}>Ingredients</label>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {ingredients.map((ing, i) => (
                  <div key={i}>
                    <div style={{
                      display:'grid',
                      gridTemplateColumns:'1fr 82px 22px',
                      columnGap:6,
                      alignItems:'center',
                    }}>
                      <input
                        ref={el => ingRefs.current[i] = el}
                        type="text" value={ing.name}
                        onChange={e => updateIng(i, 'name', e.target.value)}
                        placeholder="Ingredient"
                        style={{ ...inp, fontSize:'0.9rem', padding:'9px 11px' }}
                        onFocus={focus} onBlur={blur}
                      />
                      <input
                        type="text" value={ing.amount}
                        onChange={e => updateIng(i, 'amount', e.target.value)}
                        placeholder="Amount"
                        style={{ ...inp, fontSize:'0.9rem', padding:'9px 11px' }}
                        onFocus={focus} onBlur={blur}
                      />
                      {ingredients.length > 1 ? (
                        <button onClick={() => removeIng(i)} style={{
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
                        onChange={e => updateIng(i, 'optional', e.target.checked)}
                        style={{ width:16, height:16, accentColor:'var(--green-primary)', cursor:'pointer', flexShrink:0 }} />
                      <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)' }}>
                        Optional
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <button onClick={addIng}
                style={{ marginTop:16, fontSize:'0.82rem', color:'var(--text-secondary)',
                  background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}
                onMouseEnter={e => e.target.style.color='var(--green-primary)'}
                onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
                + Add ingredient
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
