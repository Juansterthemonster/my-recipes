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
const btnPill = {
  background:'var(--green-primary)', color:'var(--text-on-dark)', border:'none',
  borderRadius:'var(--r-full)', fontFamily:'var(--font-body)', fontSize:'0.82rem',
  fontWeight:500, padding:'9px 22px', cursor:'pointer', transition:'background 180ms'
}
const btnGhost = {
  background:'var(--white)', color:'var(--text-secondary)',
  border:'1.5px solid var(--border)', borderRadius:'var(--r-full)',
  fontFamily:'var(--font-body)', fontSize:'0.82rem', fontWeight:500,
  padding:'9px 22px', cursor:'pointer', transition:'all 180ms'
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

function TimeSection({ aH, setAH, aM, setAM, tMinH, setTMinH, tMinM, setTMinM, tMaxH, setTMaxH, tMaxM, setTMaxM }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
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

/*
  KebabIcon — three dots stacked vertically, the standard "more options" affordance.
  Inline SVG, no icon library required. Uses currentColor so it inherits the
  button's text color automatically.
*/
function KebabIcon() {
  return (
    <svg width="4" height="16" viewBox="0 0 4 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="2" cy="2"  r="1.75" fill="currentColor" />
      <circle cx="2" cy="8"  r="1.75" fill="currentColor" />
      <circle cx="2" cy="14" r="1.75" fill="currentColor" />
    </svg>
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
  const [dietary, setDietary] = useState(recipe?.dietary || [])
  const [mealType, setMealType] = useState(
    Array.isArray(recipe?.meal_type) ? recipe.meal_type
    : recipe?.meal_type ? [recipe.meal_type]   // migrate old single-string values
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
      dietary: dietary.length > 0 ? dietary : [],
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
        <button onClick={onBack} style={{
          fontSize:'0.9rem', color:'#FFFFFF',
          background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)'
        }}>Cancel</button>

        <span style={{
          fontFamily:'var(--font-body)', fontSize:'1.1rem',
          fontWeight:400, color:'#FFFFFF'
        }}>{isEdit ? 'Edit recipe' : 'New recipe'}</span>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{
              background:'transparent', color:'#FFFFFF',
              border:'1.5px solid rgba(255,255,255,0.7)',
              borderRadius:'var(--r-full)', fontFamily:'var(--font-body)',
              fontSize:'0.82rem', fontWeight:500, padding:'9px 22px',
              cursor:'pointer', opacity: saving ? 0.6 : 1,
            }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mx-4 mt-4 pb-10 lg:mx-10" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {error && (
          <div style={{
            background:'#FFF0F0', border:'1px solid #F5BABA', color:'#A03030',
            fontSize:'0.85rem', padding:'12px 16px', borderRadius:8, fontFamily:'var(--font-body)'
          }}>{error}</div>
        )}

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
          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Dietary</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
              {['Vegetarian','Vegan','Pescatarian','Gluten free'].map(opt => {
                const active = dietary.includes(opt)
                return (
                  <button key={opt} type="button"
                    onClick={() => setDietary(active ? dietary.filter(d => d !== opt) : [...dietary, opt])}
                    style={{
                      padding:'6px 14px', borderRadius:'var(--r-full)',
                      fontFamily:'var(--font-body)', fontSize:'0.78rem',
                      fontWeight: active ? 500 : 400, cursor:'pointer', transition:'all 180ms',
                      border:      active ? '1.5px solid var(--green-primary)' : '1.5px solid var(--border)',
                      background:  active ? 'var(--green-light)' : 'var(--white)',
                      color:       active ? 'var(--green-primary)' : 'var(--text-secondary)',
                    }}
                  >{opt}</button>
                )
              })}
            </div>
          </div>
          {/* Meal type — multi-select pill group, same visual style as Dietary */}
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
                      fontWeight: active ? 500 : 400, cursor:'pointer', transition:'all 180ms',
                      border:      active ? '1.5px solid var(--green-primary)' : '1.5px solid var(--border)',
                      background:  active ? 'var(--green-light)' : 'var(--white)',
                      color:       active ? 'var(--green-primary)' : 'var(--text-secondary)',
                    }}
                  >{opt}</button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Time */}
        <div style={card}>
          <TimeSection
            aH={aH} setAH={setAH} aM={aM} setAM={setAM}
            tMinH={tMinH} setTMinH={setTMinH} tMinM={tMinM} setTMinM={setTMinM}
            tMaxH={tMaxH} setTMaxH={setTMaxH} tMaxM={tMaxM} setTMaxM={setTMaxM}
          />
        </div>

        {/* Ingredients + Serves
            Dividers removed: the old code had borderTop on the optional section
            and borderBottom on each IngRow. Spacing (gap + paddingTop) creates
            visual separation without hard lines, keeping the form feeling open
            and consistent with the rest of the card sections.
        */}
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <label style={{ ...lbl, margin:0 }}>Ingredients</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', fontFamily:'var(--font-body)' }}>
                Serves
              </span>
              <input type="number" value={serves} onChange={e => setServes(e.target.value)}
                placeholder="—"
                style={{
                  width:52, background:'var(--cream)', border:'1.5px solid var(--border)',
                  borderRadius:8, fontFamily:'var(--font-body)', fontSize:'0.9rem',
                  color:'var(--text-primary)', padding:'6px 8px', outline:'none', textAlign:'center'
                }}
                onFocus={focus} onBlur={blur}
              />
            </div>
          </div>

          {/* Required ingredients — no divider lines between items */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {ingredients.map((ing, i) => (
              <div key={i}>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input ref={el => ingRefs.current[i] = el} type="text" value={ing.name}
                    onChange={e => updateIng(i, 'name', e.target.value)} placeholder="Ingredient"
                    style={{ ...inp, flex:1, fontSize:'0.9rem', padding:'9px 11px' }}
                    onFocus={focus} onBlur={blur}
                  />
                  <input type="text" value={ing.amount}
                    onChange={e => updateIng(i, 'amount', e.target.value)} placeholder="Amount"
                    style={{ ...inp, width:82, fontSize:'0.9rem', padding:'9px 11px' }}
                    onFocus={focus} onBlur={blur}
                  />
                  {ingredients.length > 1 && (
                    <button onClick={() => removeIng(i)} style={{
                      color:'var(--border)', background:'none', border:'none',
                      cursor:'pointer', fontSize:'1.2rem', lineHeight:1, width:22, flexShrink:0
                    }}>×</button>
                  )}
                </div>
                {/* Optional checkbox — tucked under the row, no divider above */}
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

          {/* Add ingredient — no divider above, just spacing */}
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

        {/* Bottom actions */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingBottom:8 }}>
          <button onClick={onBack} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ ...btnPill, opacity:saving ? 0.6 : 1 }}
            onMouseEnter={e => e.target.style.background='var(--green-mid)'}
            onMouseLeave={e => e.target.style.background='var(--green-primary)'}>
            {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
