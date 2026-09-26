// Issue #123 fixture. The recent dates are generated relative to the run so
// they always sit past the model's training cutoff; fixed dates would drift
// behind newer cutoffs and the test would pass even without the date note.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthsAgo(n: number, now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
}

function label(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function recentDates(now: Date = new Date()) {
  const currentStart = monthsAgo(5, now);
  const previousEnd = monthsAgo(6, now);
  const cert = monthsAgo(2, now);
  return {
    currentStart: label(currentStart),
    previousEnd: label(previousEnd),
    cert: label(cert),
    years: [...new Set([currentStart, previousEnd, cert].map((d) => String(d.getUTCFullYear())))],
  };
}

function buildResume(): string {
  const d = recentDates();
  return `Jordan Avery
Kitchener, ON | jordan.avery@example.com | linkedin.com/in/jordanavery

SUMMARY
Embedded and R&D engineer with experience in firmware, sensor hardware and test automation.

EXPERIENCE

R&D Engineer — Northwind Labs, Waterloo, ON (${d.currentStart} – Present)
- Worked on prototype sensor boards for the new product line
- Wrote firmware in C for STM32 microcontrollers
- Helped with test fixtures and lab automation scripts in Python

Senior Embedded Engineer — Corvid Systems, Toronto, ON (Mar 2023 – ${d.previousEnd})
- Led firmware development for a battery management system shipped to 12,000 units
- Reduced boot time by 40% by reworking the bootloader
- Mentored two junior engineers

Embedded Engineer — Halcyon Devices, Ottawa, ON (Jun 2018 – Aug 2021)
- Responsible for maintaining legacy firmware
- Wrote unit tests for the motor control library

EDUCATION
Bachelor of Applied Science, Electrical Engineering — University of Waterloo, 2018

CERTIFICATIONS
Certified LabVIEW Associate Developer (${d.cert})

SKILLS
C, C++, Python, STM32, FreeRTOS, CAN, I2C, SPI, LabVIEW, Git
`;
}

// promptfoo var loader contract: default export returning { output }.
export default function () {
  return { output: buildResume() };
}
