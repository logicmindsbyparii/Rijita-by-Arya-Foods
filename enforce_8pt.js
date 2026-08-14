const fs = require('fs');
const path = require('path');

const directories = ['client/src', 'admin/src'];

const fixMap = {
    '0.5': '0',
    '1': '2',
    '1.5': '2',
    '2.5': '2',
    '3': '4',
    '3.5': '4',
    '5': '4',
    '7': '8',
    '9': '8',
    '11': '12'
};

const prefixes = [
    'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-',
    'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
    'gap-', 'gap-x-', 'gap-y-',
    'w-', 'h-',
    'top-', 'bottom-', 'left-', 'right-',
    'space-x-', 'space-y-',
    '-m-', '-mx-', '-my-', '-mt-', '-mb-', '-ml-', '-mr-',
    '-top-', '-bottom-', '-left-', '-right-'
];

let filesChanged = 0;

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let originalContent = content;

            for (const [bad, good] of Object.entries(fixMap)) {
                for (const prefix of prefixes) {
                    const escapedPrefix = prefix.replace(/-/g, '\\-');
                    const escapedBad = bad.replace(/\./g, '\\.');
                    
                    const regex = new RegExp(`(?<=^|[\\s"'\\\`])([a-z0-9:-]*)${escapedPrefix}${escapedBad}(?=$|[\\s"'\\\`])`, 'g');
                    
                    content = content.replace(regex, `$1${prefix}${good}`);
                }
            }
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated ${fullPath}`);
                filesChanged++;
            }
        }
    }
}

directories.forEach(processDirectory);
console.log(`8-point grid enforcement complete. Modified ${filesChanged} files.`);
