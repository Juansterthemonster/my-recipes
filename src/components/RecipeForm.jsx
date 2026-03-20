import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { toMins, fromMins } from './TimePicker'

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
function TimeSection({ aH, setAH, aM, setAM, tMinH, setTMinH, tMinM, setTMinM, tMaxH, setTMaxH, tMaxM, setTMaxM, serves, setServes }) {
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
          Min to max range
        </p>
        <div style={{ display:'flex', gap:8, marginBottom:6 }}>
          <TimeBox val={tMinH} onChange={setTMinH} unit="h" />
          <TimeBox val={tMinM} onChange={setTMinM} unit="m" />
        </div>
        <p style={{ fontSize:'0.65rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)', marginBottom:6 }}>
          to (optional max)
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <TimeBox val={tMaxH} onChange={setTMaxH} unit="h" />
          <TimeBox val={tMaxM} onChange={setTMaxM} unit="m" />
        </div>
      </div>

    </div>
  )
}

export default function RecipeForm({ recipe, onBack, onSave }) {
  const isEdit = !!recipe
  const [name, setName]               = useState(recipe?.name || '')
  const [description, setDescription] = useState(recipe?.description || '')

  const ai = fromMins(recipe?.active_time_mins)
  const ti = fromMins(recipe?.total_time_min)
  const tx = fromMins(recipe?.total_time_max)
  const [aH, setAH]       = useState(ai.hours   || '')
  const [aM, setAM]       = useState(ai.minutes || '')
  const [tMinH, setTMinH] = useState(ti.hours   || '')
  const [tMinM, setTMinM] = useState(ti.minutes || '')
  const [tMaxH, setTMaxH] = useState(tx.hours   || '')
  const [tMaxM, setTMaxM] = useState(tx.minutes || '')
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
  const [steps, setSteps]   = useState(recipe?.steps?.join('\n') || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const ingRefs = useRef([])

  function updateIng(i, field, value) {
    const u = [...ingredients]; u[i] = { ...u[i], [field]:value }; setIngredients(u)
  }
  function addIng() {
    setIngredients(p => [...p, { name:'', amount:'', optional:false }])
    setTimeout(() => { ingRefs.current[ingredients.length]?.focus() }, 30)
  }
  function removeIng(i) {
    if (ingredients.length > 1) setIngredients(ingredients.filter((_,idx) => idx !== i))
  }

  async function handleSave() {
    if (!name.trim()) { setError('Please add a recipe name.'); return }
    setSaving(true); setError('')
    const payload = {
      name: name.trim(), description: description.trim() || null,
      active_time_mins: toMins(aH, aM),
      total_time_min:   toMins(tMinH, tMinM),
      total_time_max:   toMins(tMaxH, tMaxM),
      serves:  serves  ? parseInt(serves)  : null,
      cuisine: cuisine.trim() || null,
      dietary: dietary ? [dietary] : [],
      meal_type: mealType.length > 0 ? mealType : null,
      ingredients: ingredients.filter(i => i.name.trim()).map(i => ({
        name: i.name.trim(), amount: i.amount.trim(), optional: i.optional || false
      })),
      steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
    }
    let err
    if (isEdit) { ({ error:err } = await supabase.from('recipes').update(payload).eq('id', recipe.id)) }
    else        { ({ error:err } = await supabase.from('recipes').insert(payload)) }
    setSaving(false)
    if (err) { setError('Something went wrong. Please try again.'); return }
    onSave()
  }

  return (
    <div className="min-h-screen" style={{ background:'var(--cream)' }}>

      {/* Nav — forest green, white text/buttons, full-width on desktop */}
      <div
        style={{ background: 'var(--green-primary)' }}
        className="
          px-5 py-4 flex items-center justify-between sticky top-0 z-10
          lg:w-screen lg:-ml-[max(0px,calc((100vw-1400px)/2))]
          lg:pl-[max(40px,calc((100vw-1400px)/2+40px))]
          lg:pr-[max(40px,calc((100vw-1400px)/2+40px))]
        "
      >
        {/* Title — left */}
        <span style={{
          fontFamily:'var(--font-body)', fontSize:'1.1rem',
          fontWeight:400, color:'#FFFFFF'
        }}>{isEdit ? 'Edit recipe' : 'New recipe'}</span>

        {/* Cancel + Save — right, together */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Cancel — white outline, secondary */}
          <button onClick={onBack} style={{
            background:'transparent', color:'#FFFFFF',
            border:'1.5px solid rgba(255,255,255,0.55)',
            borderRadius:'var(--r-full)', fontFamily:'var(--font-body)',
            fontSize:'0.82rem', fontWeight:400, padding:'9px 22px',
            cursor:'pointer',
          }}>Cancel</button>

          {/* Save — white fill, primary */}
          <button onClick={handleSave} disabled={saving}
            style={{
              background:'#FFFFFF', color:'var(--green-primary)',
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
                  {['Vegetarian','Vegan','Pescatarian','Gluten free'].map(opt => {
                    const active = dietary === opt
                    return (
                      <button key={opt} type="button"
                        onClick={() => setDietary(active ? '' : opt)}
                        style={{
                          padding:'6px 14px', borderRadius:'var(--r-full)',
                          fontFamily:'var(--font-body)', fontSize:'0.78rem',
                          fontWeight: active ? 600 : 400, cursor:'pointer', transition:'all 180ms',
                          border:     active ? '1.5px solid #fcba04' : '1.5px solid var(--border)',
                          background: active ? '#fffbeb'             : 'var(--white)',
                          color:      active ? '#7a5c00'             : 'var(--text-secondary)',
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
                  {['Breakfast','Lunch','Dinner','Dessert','Snack'].map(opt => {
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
                tMaxH={tMaxH} setTMaxH={setTMaxH} tMaxM={tMaxM} setTMaxM={setTMaxM}
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

        {/* Bottom actions removed — Cancel + Save live in the sticky nav header */}
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
