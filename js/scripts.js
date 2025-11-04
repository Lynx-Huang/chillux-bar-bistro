/*!
* Start Bootstrap - Resume v7.0.6 (https://startbootstrap.com/theme/resume)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-resume/blob/master/LICENSE)
*/
//
// Scripts
// 

window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const sideNav = document.body.querySelector('#sideNav');
    if (sideNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#sideNav',
            rootMargin: '0px 0px -40%',
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

    // 初始化滾動魔法效果
    initScrollMagic();

});

// 滾動魔法主函數
function initScrollMagic() {
    // 添加滾動進度條
    createScrollProgressBar();
    
    // 初始化滾動觸發的動畫
    initScrollAnimations();
    
    // 初始化技能條滾動動畫
    initSkillBarsScrollAnimation();
    
    // 初始化視差效果
    initParallaxEffects();
    
    // 初始化計數器動畫
    initCounterAnimations();
    
    // 初始化元素淡入動畫
    initFadeInAnimations();
}

// 創建滾動進度條
function createScrollProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'scroll-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress-bar';
    
    progressContainer.appendChild(progressBar);
    document.body.insertBefore(progressContainer, document.body.firstChild);
    
    window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// 滾動動畫系統
function initScrollAnimations() {
    const elements = document.querySelectorAll('.resume-section');
    
    elements.forEach((element, index) => {
        // 為每個區塊添加唯一ID
        if (!element.dataset.scrollId) {
            element.dataset.scrollId = `section-${index}`;
        }
    });
    
    // 滾動事件監聽
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateScrollAnimations();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // 初始化時也執行一次
    updateScrollAnimations();
}

// 更新滾動動畫
function updateScrollAnimations() {
    const sections = document.querySelectorAll('.resume-section');
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    
    sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const elementTop = rect.top + scrollY;
        const elementHeight = rect.height;
        
        // 計算元素在視窗中的進度 (0-1)
        const elementBottom = elementTop + elementHeight;
        const viewportTop = scrollY;
        const viewportBottom = scrollY + windowHeight;
        
        // 計算可見進度
        let progress = 0;
        
        if (viewportBottom > elementTop && viewportTop < elementBottom) {
            const visibleTop = Math.max(elementTop, viewportTop);
            const visibleBottom = Math.min(elementBottom, viewportBottom);
            const visibleHeight = visibleBottom - visibleTop;
            const totalAnimationHeight = windowHeight + elementHeight;
            
            progress = Math.max(0, Math.min(1, 
                (viewportBottom - elementTop) / totalAnimationHeight
            ));
        }
        
        // 應用滾動驅動的變換
        applyScrollTransforms(section, progress, index);
    });
}

// 應用滾動變換
function applyScrollTransforms(element, progress, index) {
    const content = element.querySelector('.resume-section-content');
    if (!content) return;
    
    // 基礎淡入效果
    const opacity = Math.max(0, Math.min(1, (progress - 0.1) * 2));
    
    // 不同的動畫效果基於索引
    const animationType = index % 4;
    
    switch (animationType) {
        case 0: // 從左滑入
            const translateX = (1 - progress) * -100;
            content.style.transform = `translateX(${translateX}px)`;
            break;
            
        case 1: // 從右滑入
            const translateXRight = (1 - progress) * 100;
            content.style.transform = `translateX(${translateXRight}px)`;
            break;
            
        case 2: // 縮放效果
            const scale = 0.8 + (progress * 0.2);
            content.style.transform = `scale(${scale})`;
            break;
            
        case 3: // 從下方滑入
            const translateY = (1 - progress) * 50;
            content.style.transform = `translateY(${translateY}px)`;
            break;
    }
    
    content.style.opacity = opacity;
    
    // 旋轉效果（微妙）
    const rotation = (1 - progress) * 2;
    if (animationType === 1) {
        content.style.transform += ` rotate(${rotation}deg)`;
    }
}

// 技能條滾動動畫
function initSkillBarsScrollAnimation() {
    const skillsSection = document.querySelector('#skills');
    if (!skillsSection) return;
    
    const skillBars = skillsSection.querySelectorAll('.skill-progress');
    
    window.addEventListener('scroll', () => {
        const rect = skillsSection.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, 
            (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
        ));
        
        skillBars.forEach((bar, index) => {
            const targetWidth = parseInt(bar.style.width) || 0;
            const currentWidth = targetWidth * Math.max(0, (progress - 0.3) * 1.5);
            const delayedProgress = Math.max(0, progress - (index * 0.1));
            
            bar.style.width = `${currentWidth * delayedProgress}%`;
            bar.style.opacity = delayedProgress;
        });
    });
}

// 視差效果
function initParallaxEffects() {
    const parallaxElements = document.querySelectorAll('.resume-section-content');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        
        parallaxElements.forEach((element, index) => {
            const rate = scrolled * -0.1 * (index % 2 === 0 ? 1 : -1);
            const rect = element.getBoundingClientRect();
            
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                element.style.backgroundPosition = `center ${rate}px`;
            }
        });
    });
}

// 計數器動畫
function initCounterAnimations() {
    const counters = document.querySelectorAll('.counter');
    
    const animateCounter = (counter) => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current);
        }, 16);
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateCounter(entry.target);
            }
        });
    });
    
    counters.forEach(counter => observer.observe(counter));
}

// 元素淡入動畫
function initFadeInAnimations() {
    const fadeElements = document.querySelectorAll('.fade-on-scroll');
    
    // 為每個元素創建觀察器
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // 觸發淡入動畫
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
                
                // 如果是技能圖示，觸發子元素動畫
                if (element.classList.contains('dev-icons')) {
                    element.classList.add('fade-on-scroll');
                }
                
                // 停止觀察已動畫的元素
                observer.unobserve(element);
            }
        });
    }, observerOptions);
    
    // 開始觀察所有元素
    fadeElements.forEach(element => {
        observer.observe(element);
    });
    
    // 手動觸發滾動事件以處理視差效果
    window.addEventListener('scroll', () => {
        fadeElements.forEach(element => {
            if (!element.style.opacity || element.style.opacity === '0') {
                const rect = element.getBoundingClientRect();
                const progress = Math.max(0, Math.min(1, 
                    (window.innerHeight - rect.top) / window.innerHeight
                ));
                
                if (progress > 0.1) {
                    element.style.opacity = progress;
                    element.style.transform = `translateY(${(1 - progress) * 30}px)`;
                }
            }
        });
    });
}

// 平滑滾動
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
