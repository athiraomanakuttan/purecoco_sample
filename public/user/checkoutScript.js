    
    function changeAddress(address)
    {
        address = JSON.parse(address);
        let phonenumber= document.getElementsByName('phonenumber')[0]
        let building= document.getElementsByName('building')[0]
        let street= document.getElementsByName('street')[0]
        let city= document.getElementsByName('city')[0]
        let country= document.getElementsByName('country')[0]
        let pincode= document.getElementsByName('pincode')[0]
        
        phonenumber.value=address.phonenumber
        building.value=address.building
        street.value=address.street
        city.value=address.city
        country.value=address.country
        pincode.value=address.pincode
        
    }

    // ---------------- Cross-tab payment lock -----------------
    const procced_button= document.getElementById('procced-button')
    const paymentRadios = [
        document.getElementById('pay-methodoption1'),
        document.getElementById('pay-methodoption2'),
        document.getElementById('pay-methodoption3')
    ].filter(Boolean)

    const userId = procced_button?.getAttribute('data-user-id') || 'anonymous'
    const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const lockKey = `checkoutLock:${userId}`
    const lockHeartbeatKey = `checkoutLockHeartbeat:${userId}`
    const LOCK_STALE_MS = 12 * 1000 // 12 seconds

    const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('checkout-lock') : null

    function getLock(){
        try { return JSON.parse(localStorage.getItem(lockKey)) } catch(_) { return null }
    }
    function isLockStale(){
        const lastBeat = Number(localStorage.getItem(lockHeartbeatKey) || 0)
        return Date.now() - lastBeat > LOCK_STALE_MS
    }
    function clearStaleLockIfAny(){
        const lock = getLock()
        if(lock && isLockStale()){
            localStorage.removeItem(lockKey)
            localStorage.removeItem(lockHeartbeatKey)
        }
    }
    function isLockedByOther(){
        const lock = getLock()
        if(!lock) return false
        if(isLockStale()) return false
        return lock.tabId !== tabId
    }
    function acquireLock(){
        const existing = getLock()
        if(existing && !isLockStale() && existing.tabId !== tabId) return false
        localStorage.setItem(lockKey, JSON.stringify({ tabId, ts: Date.now() }))
        localStorage.setItem(lockHeartbeatKey, String(Date.now()))
        bc && bc.postMessage({ type:'locked', userId, tabId })
        startHeartbeat()
        // Don't show locked UI when current tab acquires lock
        return true
    }
    function releaseLock(){
        const existing = getLock()
        if(existing && existing.tabId === tabId){
            localStorage.removeItem(lockKey)
            localStorage.removeItem(lockHeartbeatKey)
            stopHeartbeat()
            bc && bc.postMessage({ type:'released', userId, tabId })
            // Don't change UI when current tab releases lock
        }
    }
    let heartbeatTimer = null
    function startHeartbeat(){
        stopHeartbeat()
        heartbeatTimer = setInterval(()=>{
            const existing = getLock()
            if(existing && existing.tabId === tabId){
                localStorage.setItem(lockHeartbeatKey, String(Date.now()))
            } else {
                stopHeartbeat()
            }
        }, 20 * 1000)
    }
    function stopHeartbeat(){
        if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null }
    }

    function setLockedUI(locked){
        const banner = document.getElementById('payment-lock-banner')
        if(locked){
            paymentRadios.forEach(r => r && r.setAttribute('disabled','disabled'))
            procced_button && procced_button.setAttribute('disabled','disabled')
            if(banner){ banner.style.display = 'block' }
        } else {
            paymentRadios.forEach(r => r && r.removeAttribute('disabled'))
            procced_button && procced_button.removeAttribute('disabled')
            if(banner){ banner.style.display = 'none' }
        }
    }

    function setLockedByOtherUI(locked){
        const banner = document.getElementById('payment-lock-banner')
        if(locked){
            paymentRadios.forEach(r => r && r.setAttribute('disabled','disabled'))
            procced_button && procced_button.setAttribute('disabled','disabled')
            if(banner){ banner.style.display = 'block' }
        } else {
            paymentRadios.forEach(r => r && r.removeAttribute('disabled'))
            procced_button && procced_button.removeAttribute('disabled')
            if(banner){ banner.style.display = 'none' }
        }
    }

    // React to other tabs
    if(bc){
        bc.onmessage = (ev)=>{
            if(!ev || !ev.data) return
            if(ev.data.userId !== userId) return
            if(ev.data.tabId === tabId) return // ignore own broadcasts
            if(ev.data.type === 'locked') setLockedByOtherUI(true)
            if(ev.data.type === 'released') {
                // Recompute instead of blindly enabling
                setLockedByOtherUI(isLockedByOther())
            }
        }
    }

    // Initialize UI lock state on load
    clearStaleLockIfAny()
    if(isLockedByOther()) setLockedByOtherUI(true)

    // Prevent changing method while locked by another tab
    paymentRadios.forEach(r => r && r.addEventListener('click', (evt)=>{
        if(isLockedByOther()){
            evt.preventDefault()
            errorNotification('Payment is already in process in another tab.')
        }
    }))

    window.addEventListener('beforeunload', ()=>{
        // Release lock if we own it (navigation away)
        releaseLock()
        // Also release server-side lock
        fetch('/release-payment-lock', { method: 'POST' }).catch(() => {})
    })

    procced_button.addEventListener('click',(e)=>{
        e.preventDefault();
        const username = document.getElementsByName('customer_name')[0].value
        const email = document.getElementsByName('customer_emailid')[0].value
        const phone = document.getElementsByName('phonenumber')[0].value
        const paymentMethod= document.getElementById('pay-methodoption1');

        if(paymentMethod.value==='razorpay')
        

        if(paymentMethod.checked  && paymentMethod.value==='razorpay')
        {
            if(isLockedByOther()){
                return errorNotification('Payment is already in process in another tab.')
            }
            if(!acquireLock()){
                return errorNotification('Unable to start payment. Try again in a moment.')
            }
            
            const URL = '/razorpay'
            fetch(URL,{
                method:'POST',
                headers:{
                    "Content-Type": "application/json"
                },
                body : JSON.stringify({
                    customer_name : document.getElementsByName('customer_name')[0].value,
                    customer_emailid : document.getElementsByName('customer_emailid')[0].value,
                    building : document.getElementsByName('building')[0].value,
                    street : document.getElementsByName('street')[0].value,
                    city : document.getElementsByName('city')[0].value,
                    country : document.getElementsByName('country')[0].value,
                    pincode : document.getElementsByName('pincode')[0].value,
                    landmark : document.getElementsByName('landmark')[0].value,
                    phonenumber : document.getElementsByName('phonenumber')[0].value,
                    coupen_code : document.getElementById('coupen-box').value
                })
            }).then((res) => {
                if(res.redirected)
                {
                    window.location.href = res.url;
                }
            else if (!res.ok) {
                if(res.status === 409) {
                    // Server-side payment lock conflict
                    errorNotification('Payment is already in progress in another tab or window.');
                    return;
                }
                return res.json().then(err => { throw new Error(err.message); });
            }
            return res.json();
        }).then((data) => {
            if (data.orderID) {
                const options = {
                    "key": "rzp_test_1CXfduMW9euDd9",
                    "amount": data.totalPrice * 100,
                    "currency": "INR",
                    "name": "PURE QOQO",
                    "order_id": data.orderID,
                    "prefill": {
                        "name": document.getElementsByName('customer_name')[0].value,
                        "email": document.getElementsByName('customer_emailid')[0].value,
                        "contact": document.getElementsByName('phonenumber')[0].value
                    },
                    "notes": {
                        "address": "Razorpay Corporate Office"
                    },
                    "theme": {
                        "color": "#6351CE"
                    },
                    "handler": function (response) {
                        // Handle successful payment here
                        console.log('Payment successful:', response);
                        
                        // Submit the form
                        releaseLock()
                        document.getElementById('check-out-form').submit();
                    },
                    "modal": {
                        "ondismiss": function () {
                            console.log("Payment failed or was dismissed.");
                            // On dismiss, mark as failed and release lock
                            document.getElementById('paymentStatus').value = 'failed'
                            releaseLock()
                            document.getElementById('check-out-form').submit();
                        }
                    }
                };

                const rzp1 = new Razorpay(options);
                rzp1.on('payment.failed', async function (response){
                  document.getElementById('paymentStatus').value = 'failed'
                  releaseLock()
                  document.getElementById('check-out-form').submit();
                })
                rzp1.open();
            }else {
                            throw new Error("Order ID not received");
                        }

        }).catch((err) => {
            console.log(err)
            errorNotification(err.message);
            releaseLock()
        });
        }
        else{
        const totalPrice = document.getElementById('total-price').getAttribute('data-price');
        const walletMethod= document.getElementById('pay-methodoption2');
        const codMethod= document.getElementById('pay-methodoption3');
        const wallet_amount = walletMethod.getAttribute('data-wallet-amount')

        if((codMethod.checked && codMethod.value === 'Cash on delivery' &&totalPrice > 1000))
        {
          Swal.fire({
            icon: "error",
            text: "Cash On Delivery is not Applicable for order above 1000. Please choose another one"
          });
        }
        else if(walletMethod.checked && walletMethod.value === 'Wallet' && totalPrice > wallet_amount )
        {
          Swal.fire({
            icon: "error",
            text: "Your available wallet balance is Low. Please choose another one "
          });
        }
        else
        {
            if(isLockedByOther()){
                return errorNotification('Payment is already in process in another tab.')
            }
            if(!acquireLock()){
                return errorNotification('Unable to start payment. Try again in a moment.')
            }
            document.getElementById('check-out-form').submit();
        }
        }
    })
    
const view_coupen = document.getElementById('view-coupen')

const coupen_divs = document.getElementById('coupen-divs')
const total_amount = document.getElementById('total-price').getAttribute('data-price')

view_coupen.addEventListener('click', () => {
  fetch('get-coupens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ total_amount: total_amount })
  })
  .then(response => {
    if(response.redirected)
                {
                    window.location.href = response.url;
                }
   return response.json()})
  .then(data => {
    console.log(data)
    const couponDivs = document.getElementById('coupen-divs');
    couponDivs.style.display = couponDivs.style.display === 'none' ? 'block' : 'none';

    if (couponDivs.style.display === 'block') {
      if(data.length === 0)
        couponDivs.innerHTML='No Available Coupens';
      else{
        couponDivs.innerHTML = data.map(coupon => {
          // Example conditional check based on coupon properties
          
          let couponContent = '';
          if (coupon.coupen_type == "Flat OFF") {
            couponContent = `
              <a href="#" data-coupen-id='${coupon._id}' onclick='selectedCoupen("${coupon._id}","${coupon.coupen_code}")'><div class="coupon">
                <div class="coupon-left">
                  
                  <h2 class="color"> ₹ ${coupon.coupen_offer_amount}</h2>
                  <p>FLAT OFF</p>
                </div>
                <div class="coupon-right">
                  <div class="coupon-code color">
                    <h5 class="color">${coupon.coupen_code}</h5>
                    <small>Use the Coupen above orders ${coupon.coupen_amount_limit} </small>
                  </div>
                </div>
              </div>
              </a>
            `;
          } else {
            couponContent = `
              <a href="#" data-coupen-id='${coupon._id}' onclick='selectedCoupen("${coupon._id}","${coupon.coupen_code}")'><div class="coupon">
                <div class="coupon-left">coupen
                  <h2 class="color">${coupon.coupen_offer_amount}%</h2>
                  <p>DISCOUNT</p>
                </div>
                <div class="coupon-right">
                  <div class="coupon-code ">
                    <h5 class="color">${coupon.coupen_code}</h5>
                    <small>Use the Coupen above orders ${coupon.coupen_amount_limit} </small>
                  </div>
                 
                </div>
              </div></a>
            `;
          }
          return couponContent;
        }).join('');
      }
    } else {
      couponDivs.innerHTML = '';
    }
  })
  .catch(err => {
    console.error('Error fetching coupons:', err);
  });
});




function selectedCoupen(id,code) {
  document.getElementById('coupen-box').value= code
  document.getElementById('coupen-box').setAttribute('data-coupen-id',id)
  document.getElementById('coupen-divs').style.display='none'
  document.getElementById('remove-coupen').style.display='inline-block'

  }


  function applyCoupen() {
    const coupen_code = document.getElementById('coupen-box').value;
    const coupen_id = document.getElementById('coupen-box').getAttribute('data-coupen-id');
    fetch('/get-single-coupen', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coupen_code: coupen_code })
    })
    .then(res => {
        if (res.redirected) {
            window.location.href = res.url;
        }
        return res.json();
    })
    .then(data => {
        if (data.message) {
            
            notificationMessage(data.message);
        } else {
            if (data) {
                const discount_div = document.getElementById('discount-div');
                const discount_span = document.getElementById('discount-span');
                const total_amount_div = document.getElementById('total-price');
                const total_amount = parseFloat(total_amount_div.getAttribute('data-price'));
                let newAmount, discount;
                if (data.coupen_type === "Percentage") {
                    discount = (total_amount * (data.coupen_offer_amount / 100));
                    newAmount = total_amount - discount;
                } else if (data.coupen_type === 'Flat OFF') {
                    discount = data.coupen_offer_amount;
                    newAmount = total_amount - discount;
                }
                discount_span.innerHTML = discount.toFixed(2);
                total_amount_div.innerHTML = newAmount.toFixed(2);
                document.getElementById('total-price').setAttribute('data-price',newAmount.toFixed(2))
                checkPayments()
            }
        }
    })
    .catch(err => console.log(err));
   
}
function removeCoupen(amount)
{
    document.getElementById('coupen-box').value=""
    document.getElementById('discount-span').innerHTML = 0
    document.getElementById('total-price').innerHTML=amount
    document.getElementById('total-price').setAttribute('data-price',amount)
  document.getElementById('remove-coupen').style.display='none'
  checkPayments()
}