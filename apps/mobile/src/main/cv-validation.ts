export function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return false;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

type CvValidationInput = {
  firstName?: string;
  lastName?: string;
  address?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  province?: string;
  area?: string;
  fivondronana?: string;
  branches?: Array<{ name?: string; group?: string; startedAt?: string; endedAt?: string }>;
  activities?: Array<{ date?: string }>;
};

export function validateCv(cv: CvValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const required: Array<[keyof CvValidationInput, string]> = [
    ['firstName', 'Fenoy ny anarana.'],
    ['lastName', 'Fenoy ny fanampiny.'],
    ['address', 'Fenoy ny adiresy.'],
    ['phone', 'Fenoy ny finday.'],
    ['email', 'Fenoy ny mailaka.'],
    ['province', 'Fenoy ny faritany.'],
    ['area', 'Fenoy ny faritra.'],
    ['fivondronana', 'Fenoy ny fivondronana.'],
  ];
  for (const [key, message] of required) {
    if (!String(cv[key] ?? '').trim()) errors[key] = message;
  }
  if (!isValidDateOnly(cv.birthDate ?? '')) errors.birthDate = 'Ampidiro daty marina amin’ny endrika YYYY-MM-DD.';
  cv.branches?.forEach((branch, index) => {
    if (!branch.name?.trim()) errors[`branches.${index}.name`] = 'Fenoy ny anaran’ny sampana.';
    if (!branch.group?.trim()) errors[`branches.${index}.group`] = 'Fenoy ny vondrona.';
    for (const key of ['startedAt', 'endedAt'] as const) {
      if (branch[key]?.trim() && !isValidDateOnly(branch[key] ?? '')) {
        errors[`branches.${index}.${key}`] = 'Ampidiro daty marina amin’ny endrika YYYY-MM-DD.';
      }
    }
  });
  cv.activities?.forEach((activity, index) => {
    if (activity.date?.trim() && !isValidDateOnly(activity.date)) {
      errors[`activities.${index}.date`] = 'Ampidiro daty marina amin’ny endrika YYYY-MM-DD.';
    }
  });
  return errors;
}
