class Calculator {
    constructor(previousOperandElement, currentOperandElement, operatorElement) {
        this.previousOperandElement = previousOperandElement;
        this.currentOperandElement = currentOperandElement;
        this.operatorElement = operatorElement;
        
        this.previousOperand = '';
        this.currentOperand = '';
        this.operator = null;
        this.result = null;
        
        this.loadFromStorage();
    }

    // حفظ الحالة في LocalStorage
    saveToStorage() {
        const state = {
            previousOperand: this.previousOperand,
            currentOperand: this.currentOperand,
            operator: this.operator,
            result: this.result
        };
        localStorage.setItem('calculatorState', JSON.stringify(state));
    }

    // تحميل الحالة من LocalStorage
    loadFromStorage() {
        const saved = localStorage.getItem('calculatorState');
        if (saved) {
            const state = JSON.parse(saved);
            this.previousOperand = state.previousOperand || '';
            this.currentOperand = state.currentOperand || '';
            this.operator = state.operator || null;
            this.result = state.result || null;
            this.updateDisplay();
        }
    }

    // حذف رقم واحد من نهاية العدد الحالي
    deleteDigit() {
        if (this.currentOperand === '') return;
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
        this.saveToStorage();
        this.updateDisplay();
    }

    // مسح الحاسبة بالكامل
    clear() {
        this.previousOperand = '';
        this.currentOperand = '';
        this.operator = null;
        this.result = null;
        this.saveToStorage();
        this.updateDisplay();
    }

    // إضافة رقم أو نقطة عشرية
    appendDigit(digit) {
        // منع إضافة أكثر من نقطة عشرية واحدة
        if (digit === '.' && this.currentOperand.includes('.')) {
            return;
        }

        // منع إضافة عدة أصفار في البداية
        if (digit === '0' && this.currentOperand === '0') {
            return;
        }

        // إذا كانت النتيجة موجودة واستخدم أراد إضافة رقم جديد
        if (this.result !== null && !this.operator) {
            this.currentOperand = digit === '.' ? '0.' : digit.toString();
            this.result = null;
            this.previousOperand = '';
        } else {
            this.currentOperand = this.currentOperand.toString() + digit.toString();
        }

        this.saveToStorage();
        this.updateDisplay();
    }

    // اختيار عملية حسابية
    chooseOperation(operation) {
        if (this.currentOperand === '') {
            if (this.previousOperand !== '') {
                this.operator = operation;
                this.updateDisplay();
            }
            return;
        }

        if (this.previousOperand !== '' && this.operator !== null) {
            this.compute();
        }

        this.operator = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '';
        this.saveToStorage();
        this.updateDisplay();
    }

    // حساب النسبة المئوية
    percentage() {
        if (this.currentOperand === '' && this.previousOperand === '') return;

        if (this.currentOperand !== '') {
            let value = parseFloat(this.currentOperand);
            value = (value / 100);
            this.currentOperand = value.toString();
        } else if (this.previousOperand !== '') {
            let value = parseFloat(this.previousOperand);
            value = (value / 100);
            this.previousOperand = value.toString();
        }

        this.saveToStorage();
        this.updateDisplay();
    }

    // حساب العملية الحسابية
    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);

        if (isNaN(prev) || isNaN(current)) return;

        switch (this.operator) {
            case '+':
                computation = prev + current;
                break;
            case '−': // استخدام الحرف الخاص للطرح
                computation = prev - current;
                break;
            case '×':
                computation = prev * current;
                break;
            case '÷':
                if (current === 0) {
                    this.clear();
                    this.currentOperandElement.value = 'لا يمكن القسمة على صفر';
                    return;
                }
                computation = prev / current;
                break;
            default:
                return;
        }

        // تقريب النتيجة لـ 10 منازل عشرية لتجنب مشاكل الفاصلة العائمة
        computation = Math.round(computation * 10000000000) / 10000000000;

        this.result = computation;
        this.currentOperand = computation.toString();
        this.operator = null;
        this.previousOperand = '';
        this.saveToStorage();
        this.updateDisplay();
    }

    // تحديث العرض
    updateDisplay() {
        this.currentOperandElement.value = this.formatNumber(this.currentOperand);
        this.previousOperandElement.textContent = this.previousOperand ? 
            `${this.formatNumber(this.previousOperand)}` : '';
        this.operatorElement.textContent = this.operator || '';
    }

    // تنسيق الأرقام برائحة آلاف
    formatNumber(number) {
        if (number === '') return '';
        
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber).toString().split('.')[0];
        const decimalDigits = stringNumber.split('.')[1];
        
        let integerDisplay = parseInt(integerDigits) ? 
            parseInt(integerDigits).toLocaleString('en', { maximumFractionDigits: 0 }) : 
            integerDigits;

        if (decimalDigits != null) {
            return `${integerDisplay}.${decimalDigits}`;
        } else {
            return integerDisplay;
        }
    }
}

// تهيئة الحاسبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const previousOperandElement = document.getElementById('previousOperand');
    const currentOperandElement = document.getElementById('display');
    const operatorElement = document.getElementById('currentOperator');

    const calculator = new Calculator(
        previousOperandElement,
        currentOperandElement,
        operatorElement
    );

    // أزرار الأرقام
    const numberButtons = document.querySelectorAll('[data-number]');
    numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            calculator.appendDigit(button.getAttribute('data-number'));
            playButtonSound('tick');
            animateButton(button);
        });
    });

    // أزرار العمليات
    const operatorButtons = document.querySelectorAll('[data-operator]');
    operatorButtons.forEach(button => {
        button.addEventListener('click', () => {
            calculator.chooseOperation(button.getAttribute('data-operator'));
            playButtonSound('pop');
            animateButton(button);
        });
    });

    // أزرار الدوال
    const functionButtons = document.querySelectorAll('[data-action]');
    functionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            
            if (action === 'clear') {
                calculator.clear();
                playButtonSound('clear');
            } else if (action === 'delete') {
                calculator.deleteDigit();
                playButtonSound('tick');
            } else if (action === 'percent') {
                calculator.percentage();
                playButtonSound('pop');
            } else if (action === 'equals') {
                calculator.compute();
                playButtonSound('success');
            }
            
            animateButton(button);
        });
    });

    // دعم لوحة المفاتيح
    document.addEventListener('keydown', (e) => {
        // منع التصرفات الافتراضية للمفاتيح المحجوزة
        if (['/', '*', '-', '+'].includes(e.key)) {
            e.preventDefault();
        }

        if (e.key >= '0' && e.key <= '9') {
            calculator.appendDigit(e.key);
            playButtonSound('tick');
        } else if (e.key === '.') {
            calculator.appendDigit('.');
            playButtonSound('tick');
        } else if (e.key === '+') {
            calculator.chooseOperation('+');
            playButtonSound('pop');
        } else if (e.key === '-') {
            calculator.chooseOperation('−');
            playButtonSound('pop');
        } else if (e.key === '*') {
            calculator.chooseOperation('×');
            playButtonSound('pop');
        } else if (e.key === '/') {
            calculator.chooseOperation('÷');
            playButtonSound('pop');
        } else if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();
            calculator.compute();
            playButtonSound('success');
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            calculator.deleteDigit();
            playButtonSound('tick');
        } else if (e.key === 'Escape') {
            e.preventDefault();
            calculator.clear();
            playButtonSound('clear');
        } else if (e.key === '%') {
            calculator.percentage();
            playButtonSound('pop');
        }
    });

    // تحديث العرض الأولي
    calculator.updateDisplay();
});

// دالة تحريك الزر عند الضغط
function animateButton(button) {
    button.classList.add('pressed');
    setTimeout(() => {
        button.classList.remove('pressed');
    }, 200);
}

// دالة لتشغيل الأصوات (اختياري - يمكن تفعيله)
function playButtonSound(type) {
    // هذه دالة للمستقبل - يمكن إضافة أصوات حقيقية لاحقاً
    // حالياً نستخدم Haptic Feedback على الأجهزة المدعومة
    if ('vibrate' in navigator) {
        if (type === 'tick') {
            navigator.vibrate(10);
        } else if (type === 'pop') {
            navigator.vibrate([20, 10, 20]);
        } else if (type === 'clear') {
            navigator.vibrate([10, 5, 10, 5, 10]);
        } else if (type === 'success') {
            navigator.vibrate([30, 20, 30]);
        }
    }
}

// معالج التركيز (Blur/Focus)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // حفظ الحالة عند مغادرة التطبيق
        console.log('التطبيق في الخلفية');
    } else {
        // التطبيق عاد للمقدمة
        console.log('التطبيق نشط');
    }
});

// منع الزووم على iPad
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });
