/** Cartoon cat for the welcome popup — styled in globals.css (HTML + CSS only). */
export default function PopupCartoonCat() {
  return (
    <span className="popup-cartoon-cat" role="img" aria-label="cartoon cat walking">
      <span className="popup-cartoon-cat__inner">
        <span className="popup-cartoon-cat__shadow" aria-hidden />
        <span className="popup-cartoon-cat__leg popup-cartoon-cat__leg--bl" aria-hidden />
        <span className="popup-cartoon-cat__leg popup-cartoon-cat__leg--br" aria-hidden />
        <span className="popup-cartoon-cat__leg popup-cartoon-cat__leg--fl" aria-hidden />
        <span className="popup-cartoon-cat__leg popup-cartoon-cat__leg--fr" aria-hidden />
        <span className="popup-cartoon-cat__figure">
          <span className="popup-cartoon-cat__tail" aria-hidden />
          <span className="popup-cartoon-cat__body" aria-hidden />
          <span className="popup-cartoon-cat__head">
            <span className="popup-cartoon-cat__ear popup-cartoon-cat__ear--l" aria-hidden />
            <span className="popup-cartoon-cat__ear popup-cartoon-cat__ear--r" aria-hidden />
            <span className="popup-cartoon-cat__eye popup-cartoon-cat__eye--l" aria-hidden />
            <span className="popup-cartoon-cat__eye popup-cartoon-cat__eye--r" aria-hidden />
            <span className="popup-cartoon-cat__nose" aria-hidden />
            <span className="popup-cartoon-cat__cheek popup-cartoon-cat__cheek--l" aria-hidden />
            <span className="popup-cartoon-cat__cheek popup-cartoon-cat__cheek--r" aria-hidden />
          </span>
        </span>
      </span>
    </span>
  );
}
