import { test, expect } from '@playwright/test';

test('무신사 검색 -> 필터(총장) -> 상품선택 -> 옵션/장바구니 담기 (Final)', async ({ page, context }) => {

  let targetProductTitle = '';

  // 1. [진입]
  await test.step('메인 페이지 진입', async () => {
    await page.goto('https://www.musinsa.com/');
    await expect(page.getByRole('button', { name: '검색 레이어 열기' }).first()).toBeVisible();
    await page.getByRole('button', { name: '검색 레이어 열기' }).first().click();
  });

  // 2. [검색]
  await test.step('검색어 입력 및 이동', async () => {
    const searchInput = page.locator('input[type="text"], input[type="search"]').filter({ hasText: '' }).last();
    await searchInput.click();
    await searchInput.fill('코트');
    await searchInput.press('Enter');
    await expect(page.locator('button[data-filter-type="남성"]')).toBeVisible({ timeout: 10000 });
  });

  // 3. [필터] 성별
  await test.step('필터: 성별(남) 선택', async () => {
    await page.locator('button[data-filter-type="남성"]').click();
  });

  // 4. [필터] 사이즈
  await test.step('필터: 사이즈 버튼 클릭', async () => {
    await page.locator('[data-filter-type="사이즈"]').click();
    await expect(page.getByText('실측')).toBeVisible();
  });

  // 5. [실측] 총장 입력
  await test.step('실측 사이즈(총장) 설정', async () => {
    await page.getByText('실측').click();
    const label = page.getByText('총장(cm)', { exact: true });
    await label.click();

    const targetContainer = page.locator('div')
        .filter({ has: label }) 
        .filter({ has: page.getByRole('button', { name: '적용' }) })
        .last();

    const inputs = targetContainer.getByRole('textbox');
    await expect(inputs.first()).toBeVisible();

    await inputs.nth(0).fill('110', { force: true });
    await inputs.nth(1).fill('120', { force: true });

    await targetContainer.getByRole('button', { name: '적용' }).last().click();
  });

  // 6. [결과] 상품보기
  await test.step('필터 적용 및 결과 확인', async () => {
    const viewButton = page.getByRole('button', { name: /.*상품.*보기/ });
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await expect(page.getByText('실측')).toBeHidden();
  });

  // -----------------------------------------------------------------------
  // 새 탭(상세페이지) 로직
  // -----------------------------------------------------------------------
  let productPage = page; 

  // 7. [선택] 상품 클릭
  await test.step('검색 결과 첫 번째 상품 클릭', async () => {
    await page.waitForTimeout(2000); 
    const pagePromise = context.waitForEvent('page');
    
    // 진짜 상품 링크만 클릭 (href에 /products/ 포함)
    const firstProduct = page.locator('a[href*="/products/"]').first();
    await firstProduct.click();

    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    productPage = newPage; 

    targetProductTitle = await productPage.title();
    console.log('상세 페이지 진입:', targetProductTitle);
    
    await expect(productPage.getByRole('button', { name: /장바구니/ })).toBeVisible({ timeout: 15000 });
  });

  // 8. [계단식] 장바구니 담기 (Firefox Fix Applied)
  await test.step('옵션 선택 및 장바구니 담기', async () => {
    const cartBtn = productPage.getByRole('button', { name: /장바구니/ }).first();
    const successMsg = productPage.getByText(/장바구니.*담았습니다|장바구니.*이동/);

    console.log('0단계: 장바구니 클릭 시도');
    await cartBtn.click();

    try {
      await expect(successMsg).toBeVisible({ timeout: 1000 });
      console.log('성공: 옵션 선택 불필요');
      return;
    } catch (e) {
      console.log('실패: 옵션 선택 필요 -> 계단식 로직 진입');
    }

    const triggers = productPage.locator('div[data-mds="StaticDropdownMenu"] div[data-mds="DropdownTriggerBox"]');
    const count = await triggers.count();
    console.log(`감지된 옵션 박스 개수: ${count}`);

    for (let i = 0; i < count; i++) {
      const trigger = triggers.nth(i);
      console.log(`옵션 ${i + 1}번 박스 클릭 시도`);
      
      await trigger.click({ force: true }); 

      const optionItemSelector = 'div[data-mds="StaticDropdownMenuItem"]:not([data-disabled])';
      const optionItem = productPage.locator(optionItemSelector)
          .filter({ hasNotText: '품절' })
          .first();

      try {
        await expect(optionItem).toBeVisible({ timeout: 2000 });
      } catch (e) {
        console.log('메뉴 안 열림 -> 재클릭 시도');
        await trigger.click();
        await expect(optionItem).toBeVisible({ timeout: 3000 }); 
      }

      const selectedText = await optionItem.innerText();
      console.log(`선택할 옵션: ${selectedText}`);
      await optionItem.click();

      await productPage.waitForTimeout(500);

      console.log(`옵션 ${i + 1} 선택 후 장바구니 재시도`);
      await cartBtn.click();

      try {
        // 파이어폭스를 위해 대기 시간을 2s -> 3s로 살짝 늘림
        await expect(successMsg).toBeVisible({ timeout: 3000 });
        console.log(`🎉 성공: 옵션 ${i + 1}번 선택 후 장바구니 담기 성공!`);
        return; 
      } catch (e) {
        console.log(`실패: 아직 옵션이 더 필요함 (${i + 1} / ${count}) -> 다음 옵션 진행`);
      }
    }

    console.log('모든 옵션 시도 종료. 성공 메시지 확인 중...');
    
    // 🚨 [Firefox 방어 로직] 혹시 클릭이 씹혔을 경우 마지막 재시도
    if (await cartBtn.isVisible()) {
        console.log('⚠️ [Last Resort] 장바구니 버튼 마지막 강제 클릭 시도');
        await cartBtn.click({ force: true });
        await productPage.waitForTimeout(1000);
    }

    // 타임아웃을 10초로 늘림 (Firefox 렌더링 지연 대응)
    await expect(successMsg).toBeVisible({ timeout: 10000 });
  });

  // 9. [확인] 장바구니 페이지 이동
  await test.step('장바구니 페이지 이동 및 검증', async () => {
    const popupCartBtn = productPage.getByText('장바구니 보기', { exact: true });

    if (await popupCartBtn.isVisible({ timeout: 3000 })) {
        console.log('팝업의 [장바구니 보기] 버튼 클릭');
        await popupCartBtn.click();
    } else {
        console.log('팝업 버튼 못 찾음 -> 상단 헤더 [장바구니] 아이콘 클릭');
        await productPage.locator('a[href*="/orders/cart"]').first().click({ force: true });
    }

    await expect(productPage).toHaveURL(/.*orders\/cart/);
    console.log('장바구니 페이지 진입 성공');

    await expect(productPage.locator('body')).not.toBeEmpty();
    // 여기서는 상품이 있어야 하므로 "없습니다"가 숨겨져 있어야 함
    await expect(productPage.getByText(/장바구니에 담.* 상품이 없습니다/)).toBeHidden();
    
    console.log('검증 완료: 장바구니에 상품이 존재합니다.');
  });

  // 10. [정리] 장바구니 비우기
  await test.step('장바구니 비우기 (Step 10)', async () => {
    console.log('🧹 장바구니 정리 시작: [전체선택] -> [선택삭제] 진행');

    // 1. 전체 선택 클릭
    const selectAllBtn = productPage.locator('.cart-all-check__wrap'); 
    await selectAllBtn.click();
    
    await productPage.waitForTimeout(500);

    // 2. 선택 삭제 버튼 클릭
    const deleteBtn = productPage.locator('.cart-all-check__delete'); 
    await deleteBtn.click();
  });

  // 11. [최종] 팝업 승인 및 빈 장바구니 검증
  await test.step('최종 삭제 승인 (Step 11)', async () => {
      console.log('🚨 확인 팝업 대기 중...');
      
      // 1. 팝업의 [삭제하기] 버튼 클릭
      const finalDeleteBtn = productPage.getByRole('button', { name: '삭제하기' }).last();
      await expect(finalDeleteBtn).toBeVisible({ timeout: 3000 });
      await finalDeleteBtn.click();

      // 2. [검증] 빈 장바구니 확인
      const emptyMsg = productPage.locator('.cart-no-result__title');
      await expect(emptyMsg).toBeVisible({ timeout: 5000 });
      await expect(emptyMsg).toContainText('장바구니에 담은 상품이 없습니다');
      
      console.log('✨ 장바구니 완전 삭제 및 메시지 검증 완료!');
  });

  console.log('😎 3개 브라우저 테스트 완료! 5초 뒤 자동으로 닫힙니다...');
  await page.waitForTimeout(5000); 

});