// Mock Interface
interface ValidationResult {
  valid: boolean
  outOfRange?: 'above' | 'below'
  exceededLimit?: 'weight' | 'height'
  suggestedDivisions?: any[]
  divisionMovePolicy?: 'allow_move' | 'disqualify_only'
}

interface CategoryConfig {
  name: string
  gender: 'male' | 'female' | 'both'
  minWeight?: number | null // kg
  maxWeight?: number | null // kg
  minHeight?: number | null // cm
  maxHeight?: number | null // cm
}

function validateWeightHeight(
  actualWeight: number | null,
  actualHeight: number | null,
  registeredCategory: any,
  age: number
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    suggestedDivisions: [] // Will be populated by server action
  }

  // Determine if this is height-based (age < 12) or weight-based (age >= 12)
  const isHeightBased = age < 12
  console.log('[VALIDATOR DEBUG]', { age, isHeightBased, actualWeight, actualHeight })

  // For height-based categories (Gradeschool - under 12)
  if (isHeightBased && (registeredCategory.minHeight !== undefined || registeredCategory.maxHeight !== undefined)) {
    if (actualHeight === null) {
      result.valid = false
      return result
    }

    const minHeight = registeredCategory.minHeight !== null && registeredCategory.minHeight !== undefined ? Number(registeredCategory.minHeight) : 0
    const maxHeight = registeredCategory.maxHeight !== null && registeredCategory.maxHeight !== undefined ? Number(registeredCategory.maxHeight) : Infinity

    if (actualHeight > maxHeight) {
      console.log(`[VALIDATOR FAIL] Height ${actualHeight} > ${maxHeight}`)
      result.valid = false
      result.outOfRange = 'above'
      result.exceededLimit = 'height'
    } else if (actualHeight < minHeight) {
      console.log(`[VALIDATOR FAIL] Height ${actualHeight} < ${minHeight}`)
      result.valid = false
      result.outOfRange = 'below'
      result.exceededLimit = 'height'
    }
  }

  // For weight-based categories (age >= 12)
  if (!isHeightBased && (registeredCategory.minWeight !== undefined || registeredCategory.maxWeight !== undefined)) {
    if (actualWeight === null) {
      result.valid = false
      return result
    }

    const minWeight = registeredCategory.minWeight !== null && registeredCategory.minWeight !== undefined ? Number(registeredCategory.minWeight) : 0
    const maxWeight = registeredCategory.maxWeight !== null && registeredCategory.maxWeight !== undefined ? Number(registeredCategory.maxWeight) : Infinity

    console.log('[VALIDATOR CHECK WEIGHT]', { actualWeight, minWeight, maxWeight })

    if (actualWeight > maxWeight) {
      console.log(`[VALIDATOR FAIL] Weight ${actualWeight} > ${maxWeight}`)
      result.valid = false
      result.outOfRange = 'above'
      result.exceededLimit = 'weight'
    } else if (actualWeight < minWeight) {
      console.log(`[VALIDATOR FAIL] Weight ${actualWeight} < ${minWeight}`)
      result.valid = false
      result.outOfRange = 'below'
      result.exceededLimit = 'weight'
    }
  }

  return result
}

const category = {
  name: 'Fin',
  gender: 'male' as const,
  minWeight: null,
  maxWeight: 45, // Number
  minHeight: null,
  maxHeight: null
};

console.log('--- TEST 1: Number Limit (45) vs Actual (46) ---');
const res1 = validateWeightHeight(46, 170, category, 15);
console.log('Result:', res1);

const categoryString = {
  ...category,
  maxWeight: "45.00" as any // Simulate DB string return
}

console.log('\n--- TEST 2: String Limit ("45.00") vs Actual (46) ---');
const res2 = validateWeightHeight(46, 170, categoryString, 15);
console.log('Result:', res2);

console.log('\n--- TEST 3: Age Mismatch (11) ---');
const res3 = validateWeightHeight(46, 170, category, 11);
console.log('Result (Age 11):', res3);
console.log('Note: Age 11 implies Height Based. If height is within limits relative to null?');
